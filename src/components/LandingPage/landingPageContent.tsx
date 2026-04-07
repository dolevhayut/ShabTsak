import ROUTES from "@/constants/routeConstants";

export type LandingHeaderProps = typeof landingPageContent.header;
export type LandingSectionProps = typeof landingPageContent.section;
export type LandingSectionTwoProps = typeof landingPageContent.sectionTwo;

export const landingPageContent = {
  "header": {
    title: "ניהול שבצ׳׳קון עבור כיתות כוננות",
    cta: "הזינו מספר עמדות, אילוצים, אורך משמרת וכמות חיילים - והמערכת תעשה לכם סדר בצורה נוחה ויעילה. לא עוד ריבים, ניירות ואקסלים מורכבים.",
    ctaButton: "המשך לקרוא",
    ctaLogin: "כבר יש לכם בסיס?",
    ctaLoginSub: "התחברו כדי להתחיל להשתמש במערכת",
    ctaLoginButton: "להתחברות",
  },
  "section": {
    preface: "אז אתם בטח שואלים את עצמכם...",
    title: "איך זה עובד?",
    content: [
      "בחרו את הבסיס שלכם או צרו בסיס חדש.",
      "הוסיפו את העמדות השונות בבסיס והגדירו את המשמרות שברצונכם לשבץ באופן אוטומטי.",
      "תוכלו לשבץ את העמדות אוטומטית בהתאם להגדרות שבחרתם עבור העמדות והחיילים בבסיס.",
    ],
    contentTwo: [
      "כמובן, ניתן גם לבחור באופן ידני ולערוך את המשמרות.",
      "המערכת מאפשרת צפייה מהירה וקלה במשמרות כדי שכל החיילים בבסיס יישארו מעודכנים בכל רגע.",
    ]
  },
  "sectionTwo": {
    title: "הישארו מעודכנים בכל רגע",
    content: [
      "צפו במשמרות בכל העמדות בקלות מכל מקום.",
      "ניתן להתחבר דרך המחשב או בנייד ולשנות את ההגדרות השונות."
    ],
    agreement: "השימוש במערכת הינו בהתאם ל$1 שלנו.",
    agreementLink: "תנאי השימוש",
    agreementLinkTo: ROUTES.TERMS
  }
};
