import { useMemo } from "react"
import { getStorageSlice } from "services/storage_service"
import { useUserDataLocalStore } from "store"
import { STORE_NAME_CONSTANTS } from "store/constants"

/**
 * Reads the access token directly from localStorage to avoid the
 * Zustand persist hydration race condition. When the store hasn't
 * rehydrated yet, the Zustand state returns null even though the
 * token is persisted — this fallback keeps us on localStorage.
 */
const getPersistedAccessToken = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("userData") || "{}")
    return stored?.state?.access_token || null
  } catch {
    return null
  }
}

/**
 * Custom hook to access a storage slice
 * @param {string} sliceName - Required. The name of the storage slice to retrieve
 * @returns {Object} The storage slice object
 */
export const useStorage = sliceName => {
  const accessToken = useUserDataLocalStore(state => state.access_token)
  const effectiveToken = accessToken || getPersistedAccessToken()

  return useMemo(() => {
    let slice = getStorageSlice(sliceName, null, effectiveToken)
    return slice
  }, [effectiveToken])
}

export const useChatStorage = () => {
  return useStorage(STORE_NAME_CONSTANTS.CHAT_DATA)
}

export const useUserStorage = () => {
  return useStorage(STORE_NAME_CONSTANTS.USER_DATA)
}

export const useSiteStorage = () => {
  return useStorage(STORE_NAME_CONSTANTS.SITE_DATA)
}
