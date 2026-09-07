import React from "react"
import { useTranslation } from "react-i18next"

function FormData({
  selectOptions,
  selectClassName,
  selectName,
  selectID,
  inputDivClass,
  isRequired,
  inputType,
  inputName,
  id,
  inputClass,
  inputOnChange,
  inputValue,
  labelDivClass,
  labelClass,
  labelName,
  layOut,
  isimportant,
  isMultiple,
  showWithinInput = false,
  selectOnChange,
  withinInputType,
  withinInputName,
  withinInputOnChange,
  withinInputValue,
  withinInputClass,
  withinInputDisabled,
  fieldError,
  showDefaultDropdownText = true,
  placeholder = "",
  selectValue,
}) {
  let optionArr = selectOptions
  let multipleValue = false
  if (isMultiple === "true") multipleValue = true

  const { t } = useTranslation()
  let defaultText = "Choose an option"

  if (t("chooseAnOption") && !showDefaultDropdownText) {
    defaultText = t("chooseAnOption")
  }

  function ShowDropDown() {
    if (optionArr === undefined || optionArr === null) optionArr = []
    return (
      <>
        <select className={selectClassName} name={selectName} onChange={selectOnChange} id={selectID} value={selectValue} multiple={multipleValue} {...(isRequired && { required: true })}>
          <option value="" disabled hidden>
            {t("chooseAnOption")}
          </option>
          {optionArr.map(option => {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            )
          })}
        </select>
      </>
    )
  }

  function showInput() {
    return (
      <>
        <div className={inputDivClass}>
          {isRequired ? (
            <>
              {fieldError && fieldError !== "" && <p className="error-phn-field">{fieldError}</p>}
              {showWithinInput && <input type={withinInputType} name={withinInputName} id={id} className={withinInputClass} onChange={withinInputOnChange} value={withinInputValue} required disabled={withinInputDisabled} placeholder={placeholder} />}
              <input type={inputType} name={inputName} id={id} className={inputClass} onChange={inputOnChange} value={inputValue} required placeholder={placeholder} />
            </>
          ) : (
            <input type={inputType} name={inputName} id={id} className={inputClass} onChange={inputOnChange} value={inputValue} placeholder={placeholder} />
          )}
        </div>
      </>
    )
  }

  function showRequired() {
    if (isimportant === "true") return <span style={{ color: "red" }}>* </span>
  }

  function showLabel() {
    return (
      <div className={labelDivClass}>
        <b htmlFor={id} className={labelClass}>
          {labelName}
          {showRequired()}
        </b>
      </div>
    )
  }

  /**
   * * Only layout 2 is used on all the active flows. Layout 1 can be considered as deprecated.
   */
  if (layOut === 1) {
    return (
      <>
        {showLabel()}
        {showInput()}
      </>
    )
  } else if (layOut === 2) {
    return (
      <>
        {showLabel()}
        <ShowDropDown />
        {fieldError && fieldError !== "" && <p className="error-phn-field">{fieldError}</p>}
      </>
    )
  } else {
    return <></>
  }
}

export default FormData
