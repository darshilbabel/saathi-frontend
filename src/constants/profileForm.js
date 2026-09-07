/**
 * Dynamic configuration object for the user profile modal form.
 * Drives field rendering using the reusable FormData component.
 * Keys align with API profile payload: name, role, school_name, state, district.
 */
export const PROFILE_FORM_SCHEMA = {
  fields: [
    {
      id: "name",
      labelName: "name",
      inputType: "text",
      placeholder: "name",
      required: true,
    },
    {
      id: "role",
      labelName: "roleDesignation",
      inputType: "text",
      placeholder: "roleDesignation",
      required: true,
    },
    {
      id: "school_name",
      labelName: "organisationSchool",
      inputType: "text",
      placeholder: "organisationSchool",
      required: true,
    },
    {
      id: "location",
      labelName: "location",
      type: "split",
      required: true,
      fields: [
        {
          id: "state",
          labelName: "state",
          inputType: "text",
          placeholder: "state",
        },
        {
          id: "district",
          labelName: "district",
          inputType: "text",
          placeholder: "district",
        },
      ],
    },
  ],
}

/** Modal-level configuration */
export const PROFILE_MODAL_CONFIG = {
  maxWidth: "480px",
}

/**
 * Helper to normalize and extract profile field values from API response/state object.
 * Reused across token validation, session validation, and UserProfileModal data-binding.
 * 
 * @param {Object} profileData - API profile object or state
 * @param {string} [fallbackName=""] - Fallback name value
 * @returns {Object} Normalized profile object: { name, role, school_name, state, district }
 */
export function extractUserProfileData(profileData = {}, fallbackName = "") {
  const canonicalName =
    profileData.name ||
    profileData.first_name ||
    profileData.firstName ||
    fallbackName ||
    ""

  return {
    name: canonicalName,
    role: profileData.role || profileData.designation || "",
    school_name: profileData.school_name || profileData.organisationSchool || "",
    state: profileData.state || profileData.userState || "",
    district: profileData.district || "",
  }
}
