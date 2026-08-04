export type PostavaId = "kapka" | "pecinka" | "stripek" | "vazicka" | "hlinka";

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
    bio: "Vylila se z kelímku s glazurou a od té doby se toulá po ateliéru. Nejradši má všechno, co se leskne.",
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
    bio: "Býval hrnek. Pak spadl ze stolu. Teď chodí po ateliéru a všem vysvětluje, že rozbít něco není konec světa.",
    oblibene: "Druhé pokusy",
    replika: "Já jsem se rozbil hned na první hodině. A pořád jsem tady.",
    tint: "#E8B440",
  },
  {
    id: "vazicka",
    name: "Vázička",
    tagline: "elegantní a voňavá",
    bio: "Nejstarší kus v ateliéru. Vždycky má v sobě čerstvé kytky a vždycky ví, jak se co dělá pořádně.",
    oblibene: "Kopretiny a rovná záda",
    replika: "Rovně sedět, rovně točit. A dýchat — na to se často zapomíná.",
    tint: "#C87E4E",
  },
];
