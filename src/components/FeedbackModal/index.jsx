import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { RxCross2 } from "react-icons/rx"
import { submitChatFeedbackApi } from "api/endpoints/feedback"
import { getChatsFromDB } from "api/endpoints/chat_flow"
import { showNotification } from "components/ToastMessage/TotastMessage"
import { FEEDBACK_TYPE, CHAT_SOURCE } from "constants/dynamic-chat"
import { useChatStorage } from "hooks/useStorage"

const isInvalidOrTempId = (id) => {
  if (id === null || id === undefined || id === "") return true
  const num = Number(id)
  if (!isNaN(num) && num > 10000000000) return true
  return false
}

const cleanText = (text) => {
  if (!text) return ""
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
}

export const resolveValidCompanyChatId = async (chatId, sessionId, chatHistory = []) => {
  if (isInvalidOrTempId(chatId) && sessionId) {
    try {
      const freshData = await getChatsFromDB(sessionId)
      const results = Array.isArray(freshData?.results) ? freshData.results : (Array.isArray(freshData) ? freshData : [])
      
      const sortedResults = [...results].sort((a, b) => {
        const idA = Number(a.id)
        const idB = Number(b.id)
        if (isNaN(idA) || isNaN(idB)) {
          return String(a.id).localeCompare(String(b.id))
        }
        return idA - idB
      })

      const targetMessage = chatHistory.find(c => c?.updated_at === chatId)
      if (targetMessage) {
        const targetCleaned = cleanText(targetMessage.msg)

        let occurrenceIndex = 0
        for (const msg of chatHistory) {
          if (msg === targetMessage) break
          if ((msg?.source === CHAT_SOURCE.BOT || msg?.role === CHAT_SOURCE.BOT) && cleanText(msg?.msg) === targetCleaned) {
            occurrenceIndex++
          }
        }

        const botDbChats = sortedResults.filter(c => c?.sender?.id === 1 || c?.role === CHAT_SOURCE.BOT)

        let dbOccurrenceIndex = 0
        for (const dbChat of botDbChats) {
          const dbText = dbChat?.translated_message || dbChat?.message
          if (cleanText(dbText) === targetCleaned) {
            if (dbOccurrenceIndex === occurrenceIndex) {
              return dbChat.id
            }
            dbOccurrenceIndex++
          }
        }
      }

      const lastBotDbChat = [...sortedResults].reverse().find(c => c?.sender?.id === 1 || c?.role === CHAT_SOURCE.BOT)
      if (lastBotDbChat?.id) {
        return lastBotDbChat.id
      }
    } catch (err) {
      console.error("Error resolving companychat ID from DB:", err)
    }
  }
  return chatId
}

/**
 * FeedbackModal — single modal for both positive and negative feedback.
 * @param {{ isOpen: boolean, type: string, companyChatId: number, sessionId: string, onClose: () => void, onSubmitted: (type: string) => void }} props
 */
function FeedbackModal({ isOpen, type, companyChatId, sessionId, onClose, onSubmitted }) {
  const { t } = useTranslation()
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [targetCompanyChatId, setTargetCompanyChatId] = useState(companyChatId)
  const chatStore = useChatStorage()
  const chatHistory = chatStore(state => state.chatHistory)
  const setChatHistory = chatStore(state => state.setChatHistory)

  useEffect(() => {
    let isMounted = true
    const resolveChatId = async () => {
      const resolvedId = await resolveValidCompanyChatId(companyChatId, sessionId, chatHistory)
      if (isMounted) {
        setTargetCompanyChatId(resolvedId)
      }
    }

    if (isOpen) {
      resolveChatId()
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, companyChatId, sessionId, chatHistory])

  if (!isOpen) return null

  const isPositive = type === FEEDBACK_TYPE.THUMBS_UP
  const title = isPositive ? t("feedbackPositiveTitle") : t("feedbackNegativeTitle")
  const placeholder = isPositive
    ? t("feedbackPositivePlaceholder")
    : t("feedbackNegativePlaceholder")

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const finalCompanyChatId = await resolveValidCompanyChatId(targetCompanyChatId, sessionId, chatHistory)

      await submitChatFeedbackApi({
        company_chat: finalCompanyChatId,
        thumbs_up: isPositive,
        thumbs_down: !isPositive,
        comment: comment.trim(),
      })

      if (typeof setChatHistory === "function" && Array.isArray(chatHistory)) {
        const updated = chatHistory.map(item => {
          if (item.updated_at === companyChatId || item.updated_at === targetCompanyChatId || item.updated_at === finalCompanyChatId) {
            return { ...item, thumbs_up: isPositive, thumbs_down: !isPositive }
          }
          return item
        })
        setChatHistory(updated)
      }

      showNotification({
        message: t("feedbackSubmitted"),
        type: "success",
        options: { autoClose: 3000, isOfflineToast: true },
      })
      onSubmitted(type)
      onClose()
    } catch {
      showNotification({
        message: t("feedbackError"),
        type: "error",
        options: { autoClose: 3000, isOfflineToast: true },
      })
    } finally {
      setIsSubmitting(false)
      setComment("")
    }
  }

  const handleClose = () => {
    setComment("")
    onClose()
  }

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h3 className="feedback-modal-title">{title}</h3>
          <button
            className="feedback-modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <RxCross2 size={18} />
          </button>
        </div>
        <p className="feedback-modal-label">{t("feedbackDetailsLabel")}</p>
        <textarea
          className="feedback-modal-textarea"
          placeholder={placeholder}
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={500}
          rows={4}
        />
        <p className="feedback-modal-hint">
          {t("feedbackHint")}
        </p>
        <div className="feedback-modal-actions">
          <button className="feedback-modal-cancel" onClick={handleClose} disabled={isSubmitting}>
            {t("cancel")}
          </button>
          <button className="feedback-modal-submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? `${t("submitting")}...` : t("submit")}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
