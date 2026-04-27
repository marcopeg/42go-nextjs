/**
 * Seed LingoCafe demo data
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcrypt");

const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

exports.seed = async function seed(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();

    await trx.withSchema("lingocafe").from("books_progress").del();
    await trx.withSchema("lingocafe").from("profiles").del();
    await trx.withSchema("lingocafe").from("events").del();
    await trx.withSchema("lingocafe").from("books_pages").del();
    await trx.withSchema("lingocafe").from("books").del();

    await trx("auth.users").where({ app_id: "lingocafe" }).del();

    const johnId = uuidv4();
    const janeId = uuidv4();

    await trx("auth.users").insert([
      {
        app_id: "lingocafe",
        id: johnId,
        name: "john",
        email: "john.doe@example.com",
        password: await hashPassword("john"),
        image: "https://api.dicebear.com/8.x/adventurer/svg?seed=john-doe",
        created_at: now,
        updated_at: now,
      },
      {
        app_id: "lingocafe",
        id: janeId,
        name: "jane",
        email: "jane.doe@example.com",
        password: await hashPassword("jane"),
        image: "https://api.dicebear.com/8.x/adventurer/svg?seed=jane-doe",
        created_at: now,
        updated_at: now,
      },
    ]);

    const books = [
      {
        id: "little-prince-en-a2",
        lang: "en",
        level: "a2",
        title: "The Little Prince",
        description: "A simple demo reader edition about a young traveler and the people he meets.",
        author: "Demo adaptation",
        tags: ["friendship", "journey", "classic"],
        cover: null,
        published_at: new Date("2026-01-10T09:00:00Z"),
        created_at: now,
        updated_at: now,
      },
      {
        id: "sherlock-holmes-en-b2",
        lang: "en",
        level: "b2",
        title: "Sherlock Holmes",
        description: "A higher-level demo mystery with careful clues and longer sentences.",
        author: "Demo adaptation",
        tags: ["mystery", "detective", "classic"],
        cover: null,
        published_at: new Date("2026-01-11T09:00:00Z"),
        created_at: now,
        updated_at: now,
      },
      {
        id: "nils-holgersson-sv-a2",
        lang: "sv",
        level: "a2",
        title: "Nils Holgerssons underbara resa",
        description: "En enkel svensk demo om en pojke som reser och lar sig se landet pa nytt.",
        author: "Demo adaptation",
        tags: ["resa", "sverige", "klassiker"],
        cover: null,
        published_at: new Date("2026-01-12T09:00:00Z"),
        created_at: now,
        updated_at: now,
      },
      {
        id: "gosta-berling-sv-b2",
        lang: "sv",
        level: "b2",
        title: "Gosta Berlings saga",
        description: "En mer avancerad svensk demo med rikare sprak och ett tydligt dramatiskt tonfall.",
        author: "Demo adaptation",
        tags: ["drama", "sverige", "klassiker"],
        cover: null,
        published_at: new Date("2026-01-13T09:00:00Z"),
        created_at: now,
        updated_at: now,
      },
    ];

    await trx.withSchema("lingocafe").into("books").insert(books);

    const pages = [
      {
        book_id: "little-prince-en-a2",
        id: "p01",
        position: 1,
        kind: "chapter",
        prefix: "Chapter 1",
        title: "A Quiet Desert",
        summary: "A pilot lands in the sand and meets an unexpected child.",
        content:
          "The plane was small, the water was low, and the night was very clear. In the morning a calm voice asked for a drawing, and the empty desert suddenly felt less lonely.",
      },
      {
        book_id: "little-prince-en-a2",
        id: "p02",
        position: 2,
        kind: "chapter",
        prefix: "Chapter 2",
        title: "A Strange Question",
        summary: "The boy asks simple things that are not simple at all.",
        content:
          "He did not ask where the pilot came from. He asked why grown-ups hurry, why they count everything, and why they forget to look carefully at one small flower.",
      },
      {
        book_id: "little-prince-en-a2",
        id: "p03",
        position: 3,
        kind: "chapter",
        prefix: "Chapter 3",
        title: "One Flower",
        summary: "The traveler speaks about care, love, and responsibility.",
        content:
          "On his tiny world there was one flower that changed every morning. To protect it meant work, patience, and attention. To leave it behind meant worry.",
      },
      {
        book_id: "little-prince-en-a2",
        id: "p04",
        position: 4,
        kind: "chapter",
        prefix: "Chapter 4",
        title: "A New Promise",
        summary: "The meeting becomes a lesson in friendship.",
        content:
          "The pilot listened more than he spoke. The boy smiled, looked at the sky, and made one thing clear: a friend is someone who learns how to see what really matters.",
      },
      {
        book_id: "sherlock-holmes-en-b2",
        id: "p01",
        position: 1,
        kind: "chapter",
        prefix: "Chapter 1",
        title: "Fog on Baker Street",
        summary: "An uneasy visitor arrives with a careful story and one missing detail.",
        content:
          "The evening fog pressed against the windowpanes while Holmes remained perfectly still. Our visitor described a theft, but his pauses were more revealing than his words.",
      },
      {
        book_id: "sherlock-holmes-en-b2",
        id: "p02",
        position: 2,
        kind: "chapter",
        prefix: "Chapter 2",
        title: "The Wrong Conclusion",
        summary: "A simple theory looks attractive until Holmes starts removing it piece by piece.",
        content:
          "What seemed obvious to the police rested on habit, not evidence. Holmes compared the mud on a shoe, the timing of a carriage, and the silence of a servant who knew too much.",
      },
      {
        book_id: "sherlock-holmes-en-b2",
        id: "p03",
        position: 3,
        kind: "chapter",
        prefix: "Chapter 3",
        title: "A Lamp Still Warm",
        summary: "Small physical clues narrow the path toward the real suspect.",
        content:
          "A lamp left burning, a glove turned inside out, and a page folded twice instead of once formed a pattern. None of these clues was loud, yet together they spoke clearly.",
      },
      {
        book_id: "sherlock-holmes-en-b2",
        id: "p04",
        position: 4,
        kind: "chapter",
        prefix: "Chapter 4",
        title: "The Final Visit",
        summary: "Holmes confronts the culprit with a chain of reasoning that leaves no room to escape.",
        content:
          "By the time we returned to Baker Street, Holmes had already settled the matter in his mind. The guilty man confessed not because he was trapped by force, but because the logic was complete.",
      },
      {
        book_id: "nils-holgersson-sv-a2",
        id: "p01",
        position: 1,
        kind: "chapter",
        prefix: "Kapitel 1",
        title: "En ny morgon",
        summary: "Nils vaknar till en stilla morgon och ser garden pa ett nytt satt.",
        content:
          "Nils star vid dorren och tittar ut over garden. Luften ar kall och klar. Allt ser vanligt ut, men han kanner att dagen kommer att bli annorlunda.",
      },
      {
        book_id: "nils-holgersson-sv-a2",
        id: "p02",
        position: 2,
        kind: "chapter",
        prefix: "Kapitel 2",
        title: "Over akern",
        summary: "Resan borjar med enkla steg och nya fragor.",
        content:
          "Han foljer en stig over akern och ser sma spar i jorden. Varje sak han moter gor honom mer nyfiken pa landet runt omkring honom.",
      },
      {
        book_id: "nils-holgersson-sv-a2",
        id: "p03",
        position: 3,
        kind: "chapter",
        prefix: "Kapitel 3",
        title: "Vid sjon",
        summary: "Vid vattnet blir Nils lugn och borjar lyssna mer noga.",
        content:
          "Sjon ligger blank i solen. Nils satter sig pa en sten och hor faglarna ropa over vattnet. For en stund tanker han inte pa att skynda vidare.",
      },
      {
        book_id: "nils-holgersson-sv-a2",
        id: "p04",
        position: 4,
        kind: "chapter",
        prefix: "Kapitel 4",
        title: "Hem igen",
        summary: "Dagen slutar, men blicken pa hemmet ar forandrad.",
        content:
          "Nar kvallen kommer tillbaka till garden ar allt som vanligt igen. Anda ser Nils mer an han gjorde pa morgonen, och det gor honom glad.",
      },
      {
        book_id: "gosta-berling-sv-b2",
        id: "p01",
        position: 1,
        kind: "chapter",
        prefix: "Kapitel 1",
        title: "En vinterkvall",
        summary: "En dramatisk ton sattes redan innan nagon hinner tala fritt.",
        content:
          "Snön lag tung over landskapet och ladorna stod som morka skepp i kvallen. Innan nagot hade skett kandes det som om luften redan bar pa en gammal konflikt.",
      },
      {
        book_id: "gosta-berling-sv-b2",
        id: "p02",
        position: 2,
        kind: "chapter",
        prefix: "Kapitel 2",
        title: "Ett rykte sprids",
        summary: "Ett enda rykte borjar flytta makten mellan manniskor.",
        content:
          "Det som forst viskades vid en dorr upprepades snart over hela garden. Varje gang historien berattades blev den rikare, farligare och svarare att stoppa.",
      },
      {
        book_id: "gosta-berling-sv-b2",
        id: "p03",
        position: 3,
        kind: "chapter",
        prefix: "Kapitel 3",
        title: "Ett svar i morkret",
        summary: "Nar pressen okar svarar nagon med ovanlig stillhet.",
        content:
          "Han valde inte den snabbaste repliken utan den mest precisa. Just darfor blev svaret kvar i allas minne, som ett ljus som vagrar slockna i morkret.",
      },
      {
        book_id: "gosta-berling-sv-b2",
        id: "p04",
        position: 4,
        kind: "chapter",
        prefix: "Kapitel 4",
        title: "Efterklang",
        summary: "Det som sas fortsatter att verka nar rummet redan har tomts.",
        content:
          "Ingen i salen kunde lataas att orden var borta. De hang kvar mellan vaggarna och foljde med hem, som om huset sjalvt hade bestamt sig for att minnas.",
      },
    ];

    await trx.withSchema("lingocafe").into("books_pages").insert(pages);

    await trx.withSchema("lingocafe").into("profiles").insert({
      user_id: janeId,
      own_lang: "en",
      target_lang: "sv",
      target_level: "a2",
      data: {},
    });

    await trx.withSchema("lingocafe").into("books_progress").insert({
      user_id: janeId,
      book_id: "nils-holgersson-sv-a2",
      page_id: "p02",
      progress_bps: 4200,
      created_at: now,
      updated_at: now,
      completed_at: null,
    });
  });
};
