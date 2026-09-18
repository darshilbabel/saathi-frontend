import Notification, { showNotification } from "../../components/ToastMessage/TotastMessage"
import "../../components/custom-style.css"
import "../../index.css"
import "./commonPageStyle.css"
import { DEFAULT_LANGUAGE } from "pages/ShikshalokamVoiceChat/enum"
import { useAudio } from "../../hooks/useAudio"
import { useNetworkStatus } from "../../hooks/useNetworkStatus"
import { useEffect, useMemo, useState, useCallback } from "react"
import env from "../../utils/env"
import { useLanguage } from "../../hooks/useLanguage"
import { useSearchParams, useNavigate, useNavigationType } from "react-router-dom"
import { useSiteDataSessionStore } from "store"
import { useSiteStorage } from "hooks/useStorage"
import Header from "../../components/Header"
import LanguageSelectionGrid from "../../components/LanguageSelectionGrid"
import LoadingSpinner from "../../components/LoadingSpinner"
import ROUTES from "../../url"
import { LANDING_PAGE_TEXT } from "constants/common"
import { useUserDataLocalStore } from "store"
import { readElevateProfileApi } from "api/endpoints/user"

function CommonHomePage() {
  const { audioRef, stopAudioTriggered, setStopAudioTriggered, stopAllAudio } = useAudio()
  const { isOffline } = useNetworkStatus()
  const [isLoading, setIsLoading] = useState(false)
  const { languageButtonSelect, handleLanguageChange } = useLanguage()
  const chatLanguage = useSiteDataSessionStore(state => state.chatLanguage)
  const hasSelectedLanguage = useSiteDataSessionStore(state => state.hasSelectedLanguage)
  const setChatLanguage = useSiteDataSessionStore(state => state.setChatLanguage)
  const setPreviousUrl = useSiteStorage()(state => state.setPreviousUrl)
  const accessToken =
    useUserDataLocalStore(
      state => state.access_token
    )

  const zustandProfileId = useUserDataLocalStore(state => state.profileId)

  const profileId =
    zustandProfileId ??
    JSON.parse(localStorage.getItem("profileid") || "null")

  const [isTokenValidating, setIsTokenValidating] = useState(() => {
    if (accessToken) return true
    // Zustand persist rehydrates asynchronously — check localStorage directly
    // so the login page never flashes while the store is still rehydrating.
    try {
      const stored = JSON.parse(localStorage.getItem("userData") || "{}")
      return !!stored?.state?.access_token
    } catch {
      return false
    }
  })

  const showLanding = useMemo(() => {
    if (accessToken) return false
    if (isTokenValidating) return false
    // Final guard: even if Zustand state is stale, never show login when
    // localStorage actually has a token (e.g. after bfcache restore or
    // when persist hydration hasn't propagated to React state yet).
    try {
      const stored = JSON.parse(localStorage.getItem("userData") || "{}")
      if (stored?.state?.access_token) return false
    } catch { /* ignore */ }
    return true
  }, [accessToken, isTokenValidating])

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const urlLanguage = useMemo(() => searchParams.get("language"), [searchParams])

  const navigationType = useNavigationType()
  const setHasSelectedLanguage = useSiteDataSessionStore(state => state.setHasSelectedLanguage)

  const languageSelected = hasSelectedLanguage || !!urlLanguage

  // If the user pressed back to return here, reset language selection
  // so they stay on the language grid instead of bouncing forward.
  useEffect(() => {
    if (navigationType === "POP") {
      if (urlLanguage) {
        searchParams.delete("language")
        const newSearch = searchParams.toString()
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + (newSearch ? `?${newSearch}` : "")
        )
      }
      setHasSelectedLanguage(false)
      return
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Record the history length at the very first home page visit, exactly once per
  // browser tab/session. Never overwritten on any subsequent mount.
  // Captures window.history.length BEFORE the pushState in the
  // [accessToken, showLanding, navigate] effect below runs — that pushed entry
  // is the duplicate home position and must be consumed during logout's backward
  // travel, not targeted as the landing point. The baseline points to the
  // original first home entry, so navigate(-stepsBack) always lands there.
  useEffect(() => {
    if (!sessionStorage.getItem("__first_home_history_length")) {
      sessionStorage.setItem("__first_home_history_length", String(window.history.length))
    }
  }, [])

  // When the browser restores this page from bfcache (back-forward cache),
  // the old pre-login DOM snapshot is shown without re-running JS.
  // Detect this and reload so the current auth state is used.
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        document.documentElement.style.visibility = "hidden"
        window.location.reload()
      }
    }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    if (!isTokenValidating) return // already validated, don't re-run

    const storedToken = accessToken
    const storedRefreshToken = useUserDataLocalStore.getState().getRefreshToken()
    ;(async () => {
      try {
        const data = await readElevateProfileApi(storedToken)
        if (data) {
          const profile = data.profile_details
          const store = useUserDataLocalStore.getState()
          store.setAccessToken(env.AUTH_METHOD() === "url" ? storedToken : true)
          if (storedRefreshToken) store.setRefreshToken(storedRefreshToken)
          store.setProfileId(profile?.profileid)
          store.setFirstName(profile?.first_name)
          store.setCompanyName(profile?.company)
          store.setState(profile?.state)
        }
      } catch (error) {
        console.error("[CommonHomePage] Token validation failed:", error)
      } finally {
        setIsTokenValidating(false)
      }
    })()
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (zustandProfileId || !profileId) return
    useUserDataLocalStore.getState().setProfileId(profileId)
  }, [zustandProfileId, profileId])

  // Intercept browser back button: SSO users should skip past the SSO redirect page.
  // Only push the trap entry when the user will stay on this page (language selection).
  // Skip it when auto-navigate to chat is about to fire — avoids the extra history entry.
  useEffect(() => {
    if (showLanding) return
    if (!accessToken) return
    if (isTokenValidating) return
    if (hasSelectedLanguage) return

    const handleBack = () => {
      navigate(-2)
    }

    if (!window.history.state?.isCustom) {
      window.history.pushState({ isCustom: true }, "", window.location.href)
    }

    window.addEventListener("popstate", handleBack)
    return () => {
      window.removeEventListener("popstate", handleBack)
    }
  }, [accessToken, showLanding, navigate, isTokenValidating, hasSelectedLanguage])

  // Initialize language and flow processing
  useEffect(() => {
    if (chatLanguage) return

    if (!urlLanguage && !languageButtonSelect) {
      setChatLanguage(DEFAULT_LANGUAGE)
    }
  }, [chatLanguage])

  // Navigate to chat once language is selected (via button or URL param)
  useEffect(() => {
    if (isTokenValidating) return
    if (showLanding) return
    if (!urlLanguage && !hasSelectedLanguage) {
      setIsLoading(false)
      return
    }

    setPreviousUrl(window.location.href)

    navigate(ROUTES.COMMON_CHAT, { replace: true })
  }, [isTokenValidating, chatLanguage, urlLanguage, hasSelectedLanguage, showLanding])

  useEffect(() => {
    handleLanguageChange(chatLanguage, audioRef, stopAllAudio, setStopAudioTriggered)
  }, [chatLanguage])

  useEffect(() => {
    if (showLanding) {
      setIsLoading(false)
    }
  }, [showLanding, setIsLoading])



  const handleLoginRedirect = useCallback(() => {
    const loginRedirectUrl = env.LOGIN_REDIRECT_URL()

    // If no LOGIN_REDIRECT_URL configured, fall back to the internal login page
    if (!loginRedirectUrl) {
      navigate(ROUTES.SHIKSHALOKAM_HOME_PAGE)
      return
    }

    // Step 1: Construct the target app URL — {SAATHI_FE_URL}{REDIRECT_URL_PATH}
    const targetUrl = new URL(env.REDIRECT_URL_PATH(), env.SAATHI_FE_URL())

    // Step 2: Append URL-encoded target URL as redirectUrl param to LOGIN_REDIRECT_URL
    const finalLoginUrl = new URL(loginRedirectUrl)
    finalLoginUrl.searchParams.set("redirectUrl", targetUrl.toString())

    // Step 3: Redirect the user
    window.location.href = finalLoginUrl.toString()
  }, [navigate])

  // Auto-navigating to common-chat — show spinner while effect navigates
  if (!isTokenValidating && !showLanding && hasSelectedLanguage) {
    return <LoadingSpinner isVisible={true} />
  }

  if (showLanding) {
    return (
      <>
        <Notification />
        {/* Mobile layout */}
        <div className="sm:hidden flex flex-col" style={{ height: "100dvh" }}>
          <div className="flex flex-col items-center justify-center px-4" style={{ height: "50dvh" }}>
            <img
              src={LANDING_PAGE_TEXT.LOGO}
              className="h-[45px] w-[130px] object-contain mb-3"
              alt="shikshalokam_logo"
            />
            <div className="text-center text-md text-slate-700 mb-1">
              <b>{LANDING_PAGE_TEXT.HEADING}</b>
            </div>
            <p className="text-center text-slate-700 mb-2">
              {LANDING_PAGE_TEXT.TAGLINE}
            </p>
            <img
              src="https://mohini-static.shikshalokam.org/fe-images/PNG/Shikshalokam/innovationpana-1@2x.png"
              className="object-contain"
              style={{ maxHeight: "200px", width: "auto" }}
              alt=""
            />
          </div>
          <div className="bg-slate-50 flex items-center justify-center" style={{ height: "50dvh" }}>
            <div className="w-64">
              <button
                type="button"
                className="w-full px-5 py-3 text-white rounded-md"
                style={{ backgroundColor: "#572E91" }}
                onClick={handleLoginRedirect}
              >
                {LANDING_PAGE_TEXT.LOGIN_BTN}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:grid sm:grid-cols-2" style={{ minHeight: "100dvh" }}>
          <div className="px-8 flex flex-col items-center justify-center">
            <div className="w-full mb-6">
              <img
                src={LANDING_PAGE_TEXT.LOGO}
                className="h-[100px] w-[200px] object-contain"
                alt="shikshalokam_logo"
              />
            </div>
            <div className="text-center text-xl mb-2 text-slate-700">
              <b>{LANDING_PAGE_TEXT.HEADING}</b>
            </div>
            <p className="text-center text-slate-700 mb-4">
              {LANDING_PAGE_TEXT.TAGLINE}
            </p>
            <img
              src="https://mohini-static.shikshalokam.org/fe-images/PNG/Shikshalokam/innovationpana-1@2x.png"
              width="360"
              height="300"
              className="center-img custom-login-image"
              alt=""
            />
          </div>
          <div className="bg-slate-50 flex items-center justify-center">
            <div className="w-64">
              <button
                type="button"
                className="w-full px-5 py-3 text-white rounded-md"
                style={{ backgroundColor: "#572E91" }}
                onClick={handleLoginRedirect}
              >
                {LANDING_PAGE_TEXT.LOGIN_BTN}
              </button>
            </div>
          </div>
        </div>

        <LoadingSpinner isVisible={isLoading} />
      </>
    )
  }

  return (
    <>
      <Notification />

      <div className="container max-w-full md mt-0 mx-auto grid md:grid-cols-2 px-0">
        {/* Desktop Header */}
        <Header languageButtonSelect={languageButtonSelect} isDesktop={true} />

        {/* Main Content */}
        <div className="w-full px-0">
          {/* Mobile Header */}
          <Header languageButtonSelect={languageButtonSelect} isDesktop={false} />

          <div className="bg-slate-50 sm:pt-6 sm:h-[100%] flex flex-col justify-center mt-0 w-full">
            <div className="flex justify-end mr-6 relative block sm:hidden"></div>

            {!hasSelectedLanguage && <LanguageSelectionGrid />}
          </div>
        </div>

        {/* Loading Spinner */}
        <LoadingSpinner isVisible={isLoading} />
      </div>
    </>
  )
}

export default CommonHomePage
