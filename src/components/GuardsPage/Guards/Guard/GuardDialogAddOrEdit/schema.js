import * as yup from "yup"

export const schema = yup
    .object({
        name: yup.string().required("חובה למלא שם").min(2, "שם חייב להיות לפחות 2 אותיות").max(50, "שם עד 50 אותיות"),
        mail: yup.string().nullable().optional().matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: "אי-מייל אינו תקין", excludeEmptyString: true }),
        phone: yup.string().nullable().optional(),
        personalId: yup.string().nullable().optional().max(20, "תעודת זהות עד 20 תווים"),
        role: yup.string().nullable().optional().max(80, "תפקיד עד 80 תווים"),
        notes: yup.string().nullable().optional().max(1000, "הערות עד 1000 תווים"),
        joinedAt: yup.string().nullable().optional(),
        team: yup.string().nullable().optional().max(80, "שם צוות עד 80 תווים"),
        color: yup.string().required("חובה לבחור צבע").matches(/^#([0-9a-fA-F]{6})$/, "צבע לא תקין"),
        shouldBeAllocated: yup.bool().default(false)
    })
    .required()