import { toast, Bounce } from "react-toastify"
import i18n from "i18next"

const defaultConfig = {
  position: "top-center",
  autoClose: 3000,
  closeButton: true,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored",
  transition: Bounce,
  style: { fontWeight: "normal" },
}

export const showNotification = ({
  message = "🦄 Default Message",
  type = "warn",
  options = {},
}: {
  message?: string
  type?: string
  options?: Record<string, any>
}) => {
  toast.clearWaitingQueue()
  toast.dismiss()

  let finalMessage = message
  let finalType = type
  let finalOptions: Record<string, any> = {
    ...options,
    style: { ...defaultConfig.style, ...options?.style },
  }

  if (typeof window !== "undefined" && !navigator.onLine) {
    finalMessage = i18n.t("offlineNetwork") || "You are offline. Please check your internet connection."
    finalType = "error"
    finalOptions = {
      ...finalOptions,
      autoClose: false,
      style: { ...finalOptions.style, color: "#fff" },
      isOfflineToast: true,
    }
  }

  return (toast as any)[finalType](finalMessage, { ...defaultConfig, ...finalOptions })
}

export const showOfflineNotification = () => {
  return showNotification({
    message: i18n.t("offlineNetwork") || "You are offline. Please check your internet connection.",
    type: "error",
    options: {
      isOfflineToast: true,
      autoClose: false,
      style: { color: "#fff" },
    },
  })
}
