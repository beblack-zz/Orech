export type PostavaId =
  | "kapka"
  | "pecinka"
  | "stripek"
  | "vazicka"
  | "hlinka"
  | "bublinka"
  | "kachlik"
  | "cedulka"
  | "samotka";

export interface Postava {
  id: PostavaId;
  name: string;
  tagline: string;
  bio: string;
  oblibene: string;
  replika: string;
  /** Barva z palety, kterou má postavička nejblíž — používá se na podklad karty */
  tint: string;
}

export const parta: Postava[] = [
  {
    id: "hlinka",
    name: "Hlínka",
    tagline: "čeká, až z ní něco bude",
    bio: "Kus hlíny, který ještě neví, čím bude. Možná miska, možná drak. Zatím hlavně spí a čeká, až ji někdo vezme do ruky.",
    oblibene: "Šlofík a mokré ruce",
    replika: "Zatím jsem jenom hrouda. Ale to se dá spravit.",
    tint: "#6B5D4F",
  },
  {
    id: "kapka",
    name: "Kapka",
    tagline: "utekla ze štětce",
    bio: "Vylila se z kelímku s glazurou a od té doby se toulá po dílně. Nejradši má všechno, co se leskne.",
    oblibene: "Modrá glazura a louže",
    replika: "Já jsem tady spíš omylem. Ale nikomu to neříkej.",
    tint: "#6366F1",
  },
  {
    id: "pecinka",
    name: "Pecinka",
    tagline: "teplá a připravená",
    bio: "Naše pec. Přes den podřimuje a v noci pracuje — uvnitř má skoro tisíc stupňů. Co z ní vyleze, to už zůstane napořád.",
    oblibene: "Teplo a trpělivost",
    replika: "Za dva týdny to bude tvrdý jako kámen. Slibuju.",
    tint: "#B84A2B",
  },
  {
    id: "stripek",
    name: "Střípek",
    tagline: "prasklý, ale nevzdává",
    bio: "Býval hrnek. Pak spadl ze stolu. Teď chodí po dílně a všem vysvětluje, že rozbít něco není konec světa.",
    oblibene: "Druhé pokusy",
    replika: "Já jsem se rozbil hned na první hodině. A pořád jsem tady.",
    tint: "#E8B440",
  },
  {
    id: "vazicka",
    name: "Vázička",
    tagline: "elegantní a voňavá",
    bio: "Nejstarší kus v dílně. Vždycky má v sobě čerstvé kytky a vždycky ví, jak se co dělá pořádně.",
    oblibene: "Kopretiny a rovná záda",
    replika: "Rovně sedět, rovně točit. A dýchat — na to se často zapomíná.",
    tint: "#C87E4E",
  },
  {
    id: "bublinka",
    name: "Bublinka",
    tagline: "tváří se nevinně, ale v peci ji nechceš",
    bio: "Jediná raubířka v partě. Schová se v hlíně, počká si na výpal a pak práskne. Přesně proto se hlína před točením tak dlouho hněte — aby ji nikdo nenašel až v peci.",
    oblibene: "Schovávaná a ticho před výpalem",
    replika: "Já tam nejsem. Fakt. Klidně to dej do pece.",
    tint: "#3A2E28",
  },
  {
    id: "kachlik",
    name: "Kachlík",
    tagline: "rovný podle pravítka a pyšný na to",
    bio: "Jediný v partě, komu se povedlo být dokonale rovný. Připomíná to při každé příležitosti a nenaklonil se od výpalu ani o stupeň. Teda skoro.",
    oblibene: "Pravítko a pravé úhly",
    replika: "Čtyři strany, čtyři pravé úhly. Zkus to taky.",
    tint: "#C87E4E",
  },
  {
    id: "cedulka",
    name: "Cedulka",
    tagline: "aby sis to poznal",
    bio: "Dva týdny na polici vypadají všechny misky stejně. Cedulka je jediná, kdo si pamatuje, čí je která — a proto si na ni každý dává pozor.",
    oblibene: "Tužka a rovné písmo",
    replika: "Napiš se na mě. Za dva týdny mi poděkuješ.",
    tint: "#6B5D4F",
  },
  {
    id: "samotka",
    name: "Šamotka",
    tagline: "leží v ohni a nestěžuje si",
    bio: "Police uvnitř pece. Snese skoro tisíc stupňů, drží na sobě všechny cizí hrnky a nikdo jí za to nikdy nepoděkuje.",
    oblibene: "Klid a vysoké teploty",
    replika: "Zvládnu to. Vždycky to zvládnu.",
    tint: "#E8B440",
  },
];
