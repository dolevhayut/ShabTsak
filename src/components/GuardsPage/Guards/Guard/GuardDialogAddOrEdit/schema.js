import * as yup from "yup"

export const schema = yup
    .object({
        name: yup.string().required("חובה למלא שם").min(2, "שם חייב להיות לפחות 2 אותיות").max(50, "שם עד 50 אותיות"),
        mail: yup.string().nullable().optional().matches(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, { message: "אי-מייל אינו תקין", excludeEmptyString: true }),
        phone: yup.string().nullable().optional(),
        personalId: yup.string().nullable().optional().max(20, "תעודת זהות עד 20 תווים"),
        color: yup.string().required("חובה לבחור צבע").matches(/^#([0-9a-fA-F]{6})$/, "צבע לא תקין"),
        shouldBeAllocated: yup.bool().default(false)
    })
    .required()