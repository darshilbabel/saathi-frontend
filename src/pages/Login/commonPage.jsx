import "../../components/custom-style.css"
import "../../index.css"
import "./commonPageStyle.css"
import { LANGUAGE_ENUMS } from "pages/ShikshalokamVoiceChat/enum"
import { sessionFlowName } from "../../constants/session"
import { URL_PARAMS } from "../../constants/urls"
import { useAudio } from "../../hooks/useAudio"
import { useEffect, useMemo, useState, useCallback } from "react"
import env from "../../utils/env"
import { useFlow } from "../../hooks/useFlow"
import { useLanguage } from "../../hooks/useLanguage"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useSiteDataSessionStore } from "store"
import { useSiteStorage } from "hooks/useStorage"
import FlowSelection from "../../components/FlowSelection"
import Header from "../../components/Header"
import LanguageSelectionGrid from "../../components/LanguageSelectionGrid"
import LoadingSpinner from "../../components/LoadingSpinner"
import ROUTES from "../../url"
import useUrlFlow from "hooks/useUrlFlow"
import { useUserDataLocalStore, useChatDataLocalStore } from "store"
import { useTranslation } from "react-i18next"
import PrivacyPolicyPopup from "../../components/TnC/privacyPolicyPopup"
import ProfileChatPopup from "../../components/ProfileChatPopup/ProfileChatPopup"
import { getProfileApi, acceptTncApi, readElevateProfileApi } from "api/endpoints/user"
import { clearFromStorage } from "../../services/storage_service"
import { getSessionDetails } from "../../services/api.service"

function CommonHomePage({ usecaseType }) {
  const { audioRef, stopAudioTriggered, setStopAudioTriggered, stopAllAudio } = useAudio()
  const { isLoading, setIsLoading, handleFlowSelection } = useFlow()
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

  const { t } = useTranslation()

  const isSaathiHome = !usecaseType

  const [isTokenValidating, setIsTokenValidating] = useState(() => isSaathiHome && !!accessToken)

  const showLanding =
    isSaathiHome &&
    !Boolean(accessToken) &&
    !isTokenValidating

  const ptm_case = sessionFlowName.megaPTM === usecaseType
  const ylc_case = sessionFlowName.YLC === usecaseType

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const { flow: urlFlow } = useUrlFlow()
  const urlLanguage = useMemo(() => searchParams.get("language"), [searchParams])

  const [isTncAccepted, setIsTncAccepted] = useState(null)
  const [isProfileComplete, setIsProfileComplete] = useState(null)
  const [showProfilePopup, setShowProfilePopup] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(false)

  const languageSelected = hasSelectedLanguage || !!urlLanguage
  const isSaathiOnboarding =
    isSaathiHome &&
    (!urlFlow || urlFlow === "saathi")

  const saathiOnboardingDone =
    !isSaathiOnboarding ||
    (
      isTncAccepted === true &&
      isProfileComplete === true &&
      !showProfilePopup
    )

  const showTnCPopup =
    isSaathiOnboarding &&
    languageSelected &&
    isTncAccepted === false &&
    !isProfileLoading

  // Record history length at first home page visit so logout can navigate back
  // to this exact history entry. Only set once per session.
  useEffect(() => {
    if (!sessionStorage.getItem("__first_home_history_length")) {
      sessionStorage.setItem("__first_home_history_length", String(window.history.length))
    }
  }, [])

  useEffect(() => {
    if (!isSaathiHome || !accessToken) return

    const storedToken = accessToken
    ;(async () => {
      try {
        const data = await readElevateProfileApi(storedToken)
        if (data) {
          clearFromStorage()
          const profile = data.profile_details
          const store = useUserDataLocalStore.getState()
          store.setAccessToken(env.AUTH_METHOD() === "url" ? storedToken : true)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (zustandProfileId || !profileId) return
    useUserDataLocalStore.getState().setProfileId(profileId)
  }, [zustandProfileId, profileId])

  // Intercept browser back button: SSO users should skip past the SSO redirect page
  useEffect(() => {
    if (showLanding) return
    if (!accessToken) return

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
  }, [accessToken, showLanding, navigate])

  // Initialize language and flow processing
  useEffect(() => {
    if (chatLanguage) return

    if (!urlLanguage && !languageButtonSelect) {
      setChatLanguage(LANGUAGE_ENUMS.ENGLISH)
    }
  }, [chatLanguage])

  useEffect(() => {
    if (!urlFlow) return

    stopAllAudio()
  }, [urlFlow])

  useEffect(() => {
    if (isTokenValidating) return
    if (showLanding) return
    if (isSaathiOnboarding && !saathiOnboardingDone) return

    if (!hasSelectedLanguage || !urlFlow) return

    navigate({
      pathname: ROUTES.COMMON_CHAT,
      search: new URLSearchParams({ [URL_PARAMS.FLOW]: urlFlow }).toString(),
    })
  }, [isTokenValidating, urlFlow, hasSelectedLanguage, showLanding, isSaathiOnboarding, saathiOnboardingDone])

  // Process language selection
  useEffect(() => {
    if (isTokenValidating) return
    if (showLanding) return
    if (!urlLanguage && !hasSelectedLanguage) {
      setIsLoading(false)
      return
    }
    if (isSaathiOnboarding && !saathiOnboardingDone) return


    if (ptm_case) {
      navigate(ROUTES.SHIKSHALOKAM_PTM_CHAT_PAGE)
      return
    }

    if (ylc_case) {
      navigate(ROUTES.SHIKSHALOKAM_YLC_CHAT_PAGE)
      return
    }

    if (!urlFlow) {
      setIsLoading(false)
      return
    }

    const URL_PARAMS_MAP = {
      [sessionFlowName.ListeningActivity]: ROUTES.SHIKSHALOKAM_GUEST_LISTENING_CHAT,
      [sessionFlowName.ParentPerceptionSurvey]: ROUTES.SHIKSHALOKAM_PPPI_VOICE_CHAT,
    }
    setPreviousUrl(window.location.href)

    if (URL_PARAMS_MAP[urlFlow]) {
      navigate(URL_PARAMS_MAP[urlFlow])
      return
    }

    navigate({
      pathname: ROUTES.COMMON_CHAT,
      search: new URLSearchParams({ [URL_PARAMS.FLOW]: urlFlow }).toString(),
    })
  }, [isTokenValidating, chatLanguage, urlLanguage, urlFlow, hasSelectedLanguage, showLanding, isSaathiOnboarding, saathiOnboardingDone])

  useEffect(() => {
    handleLanguageChange(chatLanguage, audioRef, stopAllAudio, setStopAudioTriggered)
  }, [chatLanguage])

  useEffect(() => {
    if (showLanding) {
      setIsLoading(false)
    }
  }, [showLanding, setIsLoading])

  useEffect(() => {
    if (!isSaathiOnboarding) return
    if (showLanding) return
    if (!languageSelected) return
    if (isTncAccepted !== null) return

    if (!profileId) {
      setIsTncAccepted(true)
      setIsProfileComplete(true)
      useUserDataLocalStore.getState().setAcceptedTnC(true)
      return
    }

    let cancelled = false
    setIsProfileLoading(true)

    ;(async () => {
      const data = await getProfileApi(profileId)
      if (cancelled) return

      setIsProfileLoading(false)

      if (
        typeof data?.is_tnc_accepted !== "boolean" ||
        typeof data?.is_profile_complete !== "boolean"
      ) {
        setIsTncAccepted(true)
        setIsProfileComplete(true)
        useUserDataLocalStore.getState().setAcceptedTnC(true)
        return
      }

      setIsTncAccepted(data.is_tnc_accepted)
      setIsProfileComplete(data.is_profile_complete)

      if (data.is_tnc_accepted !== false) {
        useUserDataLocalStore.getState().setAcceptedTnC(true)
      }

      if (data.is_tnc_accepted === true && data.is_profile_complete === false) {
        setShowProfilePopup(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isSaathiOnboarding, showLanding, profileId, languageSelected, isTncAccepted])

  const handleAcceptTnC = useCallback(async () => {
    try {
      await acceptTncApi(profileId)
      setIsTncAccepted(true)
      useUserDataLocalStore.getState().setAcceptedTnC(true)
      if (isProfileComplete === false) {
        setShowProfilePopup(true)
      }
    } catch (error) {
      console.error(error)
    }
  }, [profileId, isProfileComplete])

  const handleProfilePopupClose = useCallback(async () => {
    const {
      setIsOldChatOpen,
      setIsNewChatOpen,
      setShowHomepage,
      setSessionId,
      setIntroMessage,
      setStrandStep,
      setChatHistory,
    } = useChatDataLocalStore.getState()

    // Mirror resetChat() (without reload)
    setIsOldChatOpen(false)
    setIsNewChatOpen(true)
    setShowHomepage(true)
    setIntroMessage(null)
    setSessionId(null)
    setStrandStep(null)
    setChatHistory([])

    try {
      const session = await getSessionDetails()
      setSessionId(session.sessionid)
    } catch (error) {
      console.error("[handleProfilePopupClose] getSessionDetails failed:", error)
    } finally {
      setShowProfilePopup(false)
      setIsProfileComplete(true)
    }
  }, [showProfilePopup])

  const handleLoginRedirect = useCallback(() => {
    const loginRedirectUrl = env.LOGIN_REDIRECT_URL()

    // If no LOGIN_REDIRECT_URL configured, fall back to the internal login page
    if (!loginRedirectUrl) {
      navigate(ROUTES.SHIKSHALOKAM_VOICE_CHAT_LOGIN)
      return
    }

    // Step 1: Construct the target app URL — {SAATHI_FE_URL}{REDIRECT_URL_PATH}?flow={FLOW_NAME}
    const targetUrl = new URL(env.REDIRECT_URL_PATH(), env.SAATHI_FE_URL())
    targetUrl.searchParams.set("flow", env.FLOW_NAME())

    // Step 2: Append URL-encoded target URL as redirectUrl param to LOGIN_REDIRECT_URL
    const finalLoginUrl = new URL(loginRedirectUrl)
    finalLoginUrl.searchParams.set("redirectUrl", targetUrl.toString())

    // Step 3: Redirect the user
    window.location.href = finalLoginUrl.toString()
  }, [navigate])

  const onFlowContinue = () => {
    return handleFlowSelection(stopAllAudio)
  }

  if (showLanding) {
    return (
      <>
        {/* Mobile layout */}
        <div className="sm:hidden flex flex-col" style={{ height: "100dvh" }}>
          <div className="flex flex-col items-center justify-center px-4" style={{ height: "50dvh" }}>
            <img
              src={t("pageLogo")}
              className="h-[45px] w-[130px] object-contain mb-3"
              alt="shikshalokam_logo"
            />
            <div className="text-center text-md text-slate-700 mb-1">
              <b>{t("landing_heading")}</b>
            </div>
            <p className="text-center text-slate-700 mb-2">
              {t("landing_tagline")}
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
                {t("landing_login_btn")}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:grid sm:grid-cols-2" style={{ minHeight: "100dvh" }}>
          <div className="px-8 flex flex-col items-center justify-center">
            <div className="w-full mb-6">
              <img
                src={t("pageLogo")}
                className="h-[100px] w-[200px] object-contain"
                alt="shikshalokam_logo"
              />
            </div>
            <div className="text-center text-xl mb-2 text-slate-700">
              <b>{t("landing_heading")}</b>
            </div>
            <p className="text-center text-slate-700 mb-4">
              {t("landing_tagline")}
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
                {t("landing_login_btn")}
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
      {showTnCPopup && (
        <PrivacyPolicyPopup
          tncText={t("tncText")}
          onAccept={handleAcceptTnC}
          useStaticText={false}
          isGuestChat={false}
        />
      )}

      {isSaathiOnboarding && showProfilePopup && (
        <ProfileChatPopup isOpen={showProfilePopup} onClose={handleProfilePopupClose} />
      )}

      <div className="container max-w-full md mt-0 mx-auto grid md:grid-cols-2 px-0">
        {/* Desktop Header */}
        <Header languageButtonSelect={languageButtonSelect} isDesktop={true} />

        {/* Main Content */}
        <div className="w-full px-0">
          {/* Mobile Header */}
          <Header languageButtonSelect={languageButtonSelect} isDesktop={false} />

          <div className="bg-slate-50 sm:pt-6 sm:h-[100%] flex flex-col justify-center mt-0 w-full">
            <div className="flex justify-end mr-6 relative block sm:hidden"></div>

            {!hasSelectedLanguage && <LanguageSelectionGrid usecaseType={usecaseType} />}
            {!ptm_case && !ylc_case && hasSelectedLanguage && !urlFlow && saathiOnboardingDone && (
              <FlowSelection
                audioRef={audioRef}
                stopAudioTriggered={stopAudioTriggered}
                setStopAudioTriggered={setStopAudioTriggered}
                onFlowContinue={onFlowContinue}
                setIsLoading={setIsLoading}
              />
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        <LoadingSpinner isVisible={isLoading || (isSaathiOnboarding && isProfileLoading)} />
      </div>
    </>
  )
}

export default CommonHomePage
