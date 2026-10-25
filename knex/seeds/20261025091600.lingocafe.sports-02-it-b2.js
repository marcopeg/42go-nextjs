const books = [
{
  "id": "il-mondo-dello-sport-20-imprese-di-velocità-acqua-e-resistenza-vol-2-it-b2",
  "project": "sports-02",
  "lang": "it",
  "level": "b2",
  "title": "Il mondo dello sport: 20 imprese di velocità, acqua e resistenza, Vol. 2",
  "description": "Scopri venti appassionanti discipline sportive in un'edizione graduata per studenti di livello CEFR B2.",
  "author": "LingoCafe",
  "tags": [
    "sports",
    "athletics",
    "nonfiction",
    "games",
    "fitness"
  ],
  "info": {
    "chapters_count": 20,
    "words_count": 837
  },
  "published_at": "2026-10-25T09:00:00.000Z",
  "questionnaireSql": null,
  "pages": [
    {
      "id": "part_01",
      "position": 1,
      "kind": "part",
      "prefix": "Parte 1",
      "title": "La pista olimpica",
      "summary": "I 100 metri piani, la maratona, il salto in alto, l'asta e il salto in lungo.",
      "content": null
    },
    {
      "id": "part_01-ch_01",
      "position": 2,
      "kind": "chapter",
      "prefix": "Capitolo 1",
      "title": "I 100 metri: Pura velocità esplosiva",
      "summary": "The 100-meter dash is the premier blue-ribbon event of athletics. In under ten seconds, sprinters explode from starting blocks, accelerate up to forty-four kilometers per hour, and cross the finish line in a blur of power.",
      "content": "I cento metri piani rappresentano l'essenza pura della velocità umana. Dai blocchi di partenza gli atleti scattano al millesimo di secondo dal colpo di pistola, spingendo con forza sul tartan sintetico. Raggiunta la massima velocità a metà rettilineo, la vittoria si decide per pochi centimetri sul traguardo."
    },
    {
      "id": "part_01-ch_02",
      "position": 3,
      "kind": "chapter",
      "prefix": "Capitolo 2",
      "title": "La maratona: 42 chilometri di volontà",
      "summary": "Commemorating the soldier Pheidippides, the marathon tests human endurance over forty-two point one nine five kilometers. Thousands of runners conquer city avenues and inner doubts.",
      "content": "La maratona è il viaggio supremo nella resistenza umana lungo quarantadue chilometri. Dal mito greco alle grandi vie cittadine di New York e Londra, ogni maratoneta combatte contro la fatica muscolare e la temuta crisi del trentesimo chilometro, spinto da una ferrea determinazione interiore."
    },
    {
      "id": "part_01-ch_03",
      "position": 4,
      "kind": "chapter",
      "prefix": "Capitolo 3",
      "title": "Salto in alto: L'arte di volare all'indietro",
      "summary": "High jumpers turn horizontal speed into vertical elevation using a curved run-up and the famous Fosbury flop, passing backwards over a crossbar resting more than two meters high.",
      "content": "Il salto in alto ha conosciuto una rivoluzione epocale con l'invenzione dello stile Fosbury. Curvando la rincorsa a forma di 'J', l'atleta sfrutta la forza centrifuga per staccare verso l'alto e superare l'asticella di schiena, atterrando con precisione sui grandi materassi protettivi."
    },
    {
      "id": "part_01-ch_04",
      "position": 5,
      "kind": "chapter",
      "prefix": "Capitolo 4",
      "title": "Salto con l'asta: Catapultati verso il cielo",
      "summary": "Combining the speed of a sprinter with the aerial acrobatics of a gymnast, pole vaulters plant a bending carbon pole to vault over crossbars higher than a two-story building.",
      "content": "Il salto con l'asta unisce la velocità di uno sprinter alla forza acrobatica di un ginnasta. Piantando l'asta flessibile nella buca d'arresto, l'atleta sfrutta l'energia elastica per ribaltarsi a testa in giù e catapultarsi oltre i sei metri d'altezza sopra lo stadio."
    },
    {
      "id": "part_01-ch_05",
      "position": 6,
      "kind": "chapter",
      "prefix": "Capitolo 5",
      "title": "Salto in lungo: Il volo nella sabbia",
      "summary": "Sprinting down the runway, long jumpers hit a wooden takeoff board without fouling, launch into an aerodynamic hitch-kick, and extend their heels as far forward into the sand as possible.",
      "content": "Il salto in lungo è una parabola di potenza e sincronismo. Lo stacco dall'asse di battuta deve avvenire a filo del millimetro per evitare il nullo. In volo, l'atleta compie passi aerei per mantenere l'equilibrio prima di allungare le gambe in avanti e atterrare nella sabbia."
    },
    {
      "id": "part_02",
      "position": 7,
      "kind": "part",
      "prefix": "Parte 2",
      "title": "Sport acquatici e fiumi",
      "summary": "Nuoto stile libero, canottaggio sincronizzato, vela d'altura, surf e kayak nelle rapide.",
      "content": null
    },
    {
      "id": "part_02-ch_06",
      "position": 8,
      "kind": "chapter",
      "prefix": "Capitolo 6",
      "title": "Nuoto stile libero: Solcare l'acqua",
      "summary": "Swimming pits human power against the dense resistance of water. Through refined front crawl strokes, underwater dolphin kicks, and lightning flip turns, swimmers slice through chlorinated lanes.",
      "content": "Il nuoto agonistico è un esercizio di pura idrodinamica. Nello stile libero la trazione delle braccia e la battuta di gambe spingono l'atleta attraverso la corsia. Le virate con capovolta contro la parete e le fasi subacquee a delfino sono fondamentali per vincere la resistenza dell'acqua."
    },
    {
      "id": "part_02-ch_07",
      "position": 9,
      "kind": "chapter",
      "prefix": "Capitolo 7",
      "title": "Canottaggio: Armonia e potenza sul fiume",
      "summary": "In rowing eights, eight athletes move backwards in absolute unison, driving oars through calm lake waters while guided by a coxswain shouting cadence.",
      "content": "Il canottaggio fonde potenza muscolare e precisione ritmica impeccabile. Sugli scafi affusolati a sedile mobile, gli otto vogatori spingono con le gambe all'unisono guidati dalla voce del timoniere. La barca solca le acque calme del campo di regata con una grazia spettacolare."
    },
    {
      "id": "part_02-ch_08",
      "position": 10,
      "kind": "chapter",
      "prefix": "Capitolo 8",
      "title": "Vela: Dominare i venti dell'oceano",
      "summary": "Harnessing aerodynamic lift across canvas and carbon sails, sailors navigate changing winds and currents. Modern hydrofoil boats lift completely out of the water at highway speeds.",
      "content": "La vela sfrutta la fisica del vento per scivolare sui mari. Regolando le scotte della randa e del fiocco, gli equipaggi risalgono il vento con precisione millimetrica. Nelle moderne regate dell'America's Cup, scafi alati 'volano' sull'acqua a velocità strabilianti."
    },
    {
      "id": "part_02-ch_09",
      "position": 11,
      "kind": "chapter",
      "prefix": "Capitolo 9",
      "title": "Surf: Cavalcare le onde del Pacifico",
      "summary": "Born among royalty in ancient Hawaii, surfing turns ocean waves into dynamic playgrounds. Athletes paddle out, drop into steep wave faces, and carve turns along breaking crests.",
      "content": "Il surf affonda le radici nelle tradizioni polinesiane delle Hawaii. Pagaiando oltre i frangenti, il surfista sceglie il momento esatto per alzarsi sulla tavola e cavalcare la parete d'acqua in caduta libera. Entrare nel 'tubo' dell'onda regala sensazioni indescrivibili di pura adrenalina."
    },
    {
      "id": "part_02-ch_10",
      "position": 12,
      "kind": "chapter",
      "prefix": "Capitolo 10",
      "title": "Kayak: Rapide impetuose e acque calme",
      "summary": "Invented by Arctic Inuit hunters, the closed-cockpit kayak glides through icy fjords or navigates churning Class V whitewater rapids with a two-bladed paddle.",
      "content": "Il kayak offre un contatto intimo e viscerale con fiumi e mari. Con la pagaia a doppia pala e la calotta ermetica paraschizzi, il canoista affronta cascate e rapide vorticose, pronto a eseguire il 'roll' di salvataggio per raddrizzare lo scafo in pochi istanti."
    },
    {
      "id": "part_03",
      "position": 13,
      "kind": "part",
      "prefix": "Parte 3",
      "title": "Due ruote e pedali",
      "summary": "Ciclismo su strada, mountain bike su sentieri, velodromi parabolici, salti BMX e triathlon.",
      "content": null
    },
    {
      "id": "part_03-ch_11",
      "position": 14,
      "kind": "chapter",
      "prefix": "Capitolo 11",
      "title": "Ciclismo su strada: I Grandi Giri",
      "summary": "Covering thousands of kilometers across three weeks, road cycling's Grand Tours pit teams against mountain passes and crosswinds in an exhausting endurance chess match.",
      "content": "Il ciclismo su strada è poesia e fatica lungo le grandi corse a tappe come il Giro d'Italia e il Tour de France. I corridori viaggiano compatti nel gruppo per sfruttare la scia aerodinamica, prima che le leggendarie salite alpine selezionino i veri campioni della classifica generale."
    },
    {
      "id": "part_03-ch_12",
      "position": 15,
      "kind": "chapter",
      "prefix": "Capitolo 12",
      "title": "Mountain bike: Domare i sentieri selvaggi",
      "summary": "Born in Northern California's Marin County, mountain biking takes riders away from paved roads onto steep dirt trails, forest singletracks, and rugged alpine boulder fields.",
      "content": "La mountain bike ha rivoluzionato il ciclismo aprendo le porte alla natura selvaggia. Con telai biammortizzati e freni a disco idraulici, i biker dominano sentieri impervi, salti su roccia e discese mozzafiato con equilibrio e riflessi pronti."
    },
    {
      "id": "part_03-ch_13",
      "position": 16,
      "kind": "chapter",
      "prefix": "Capitolo 13",
      "title": "Ciclismo su pista: Il velodromo parabolico",
      "summary": "Raced on banked oval indoor tracks made of polished pine, track cycling features ultralight brakeless fixed-gear bicycles reaching speeds over seventy kilometers per hour.",
      "content": "Il ciclismo su pista è una scarica di pura adrenalina su curve sopraelevate in legno. Le biciclette a scatto fisso non hanno freni e richiedono pedalata continua a frequenze altissime. Le gare di velocità e inseguimento a squadre regalano finali spettacolari sul filo dei millesimi."
    },
    {
      "id": "part_03-ch_14",
      "position": 17,
      "kind": "chapter",
      "prefix": "Capitolo 14",
      "title": "BMX: Curve paraboliche e salti acrobatici",
      "summary": "Originating in Southern California as a youth alternative to motocross, BMX pits eight riders on twenty-inch bikes across a roller-coaster dirt track packed with jumps and berms.",
      "content": "La BMX ha conquistato il mondo con la sua energia giovanile e spericolata. Dalla rampa di partenza otto concorrenti scendono all'unisono lungo un tracciato sterrato costellato di dossi e salti giganti, sfidandosi a colpi di pedale e traiettorie millimetriche."
    },
    {
      "id": "part_03-ch_15",
      "position": 18,
      "kind": "chapter",
      "prefix": "Capitolo 15",
      "title": "Triathlon: Nuoto, bici e corsa senza sosta",
      "summary": "Triathlon combines three distinct endurance disciplines into a continuous race: open-water swimming, road cycling, and long-distance running, separated by swift gear transitions.",
      "content": "Il triathlon è il test multidisciplinare per eccellenza. Gli atleti nuotano in acque libere, salgono in sella alla bici da corsa e infine affrontano la maratona di corsa. La velocità nei cambi di zona di transizione è fondamentale quanto la resistenza fisica."
    },
    {
      "id": "part_04",
      "position": 19,
      "kind": "part",
      "prefix": "Parte 4",
      "title": "Forza, bersaglio e decathlon",
      "summary": "Sollevamento pesi olimpico, powerlifting, tiro con l'arco, tiro del giavellotto e il completo decathlon.",
      "content": null
    },
    {
      "id": "part_04-ch_16",
      "position": 20,
      "kind": "chapter",
      "prefix": "Capitolo 16",
      "title": "Sollevamento pesi: Strappo e slancio",
      "summary": "Contested in two classic lifts—the snatch and the clean and jerk—Olympic weightlifting demands explosive power and millimeter-precise balance to lift heavy iron overhead.",
      "content": "La pesistica olimpica esprime la massima potenza esplosiva del corpo umano. Nei due movimenti dello strappo e dello slancio, l'atleta solleva il bilanciere carico di dischi d'acciaio con velocità e coordinazione, attendendo le tre luci bianche dei giudici a braccia tese."
    },
    {
      "id": "part_04-ch_17",
      "position": 21,
      "kind": "chapter",
      "prefix": "Capitolo 17",
      "title": "Powerlifting: Squat, panca piana e stacco",
      "summary": "Powerlifting measures absolute static strength through three foundational barbell lifts: the squat, the bench press, and the deadlift, summed into a total score.",
      "content": "Il powerlifting valuta la forza massimale attraverso tre grandi alzate con bilanciere: lo squat profondo, la distensione su panca piana con fermo al petto e lo stacco da terra. Gli atleti sollevano carichi titanici spingendo la resistenza muscolare ai suoi limiti."
    },
    {
      "id": "part_04-ch_18",
      "position": 22,
      "kind": "chapter",
      "prefix": "Capitolo 18",
      "title": "Tiro con l'arco: Concentrazione e centro perfetto",
      "summary": "One of humanity's oldest inventions, target archery demands supreme calm and heartbeat control to loose carbon arrows into a twelve-centimeter yellow ring seventy meters away.",
      "content": "Il tiro con l'arco trasforma la concentrazione mentale in precisione assoluta. Tirando la corda dell'arco ricurvo fino al mento, l'arciere fissa il centro giallo del bersaglio a settanta metri di distanza, rilasciando la freccia tra un battito cardiaco e l'altro."
    },
    {
      "id": "part_04-ch_19",
      "position": 23,
      "kind": "chapter",
      "prefix": "Capitolo 19",
      "title": "Lancio del giavellotto: Il volo della lancia",
      "summary": "Inherited directly from ancient warriors, the javelin throw sends an eight-hundred-gram metal spear soaring through the stadium air for distances exceeding ninety meters.",
      "content": "Il lancio del giavellotto rievoca le sfide guerriere dell'antica Olimpia. Dopo una rincorsa ritmata da passi incrociati laterali, l'atleta blocca la gamba d'appoggio per scagliare l'asta d'acciaio verso il cielo a velocità impressionante."
    },
    {
      "id": "part_04-ch_20",
      "position": 24,
      "kind": "chapter",
      "prefix": "Capitolo 20",
      "title": "Decathlon: La corona dell'atleta completo",
      "summary": "Spanning ten events over forty-eight hours—from sprints and pole vault to throws and the 1500m—the decathlon crowns the Olympic champion as the world's greatest athlete.",
      "content": "Il decathlon incorona il re incontrastato dell'atletica leggera. In due giornate estenuanti e dieci discipline diverse, gli atleti devono eccellere in salti, lanci e corse veloci, prima di chiudere la fatica sui millecinquecento metri tra gli applausi generali."
    }
  ]
}
];

exports.seed = async function (knex) {
  await knex.transaction(async (trx) => {
    for (const book of books) {
      const { questionnaireSql, pages, ...bookData } = book;

      await trx.withSchema('lingocafe').table('books')
        .insert({
          ...bookData,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        })
        .onConflict('id')
        .merge({
          ...bookData,
          updated_at: knex.fn.now()
        });

      const existingPages = await trx.withSchema('lingocafe').table('books_pages')
        .where({ book_id: book.id })
        .select('id', 'book_id', 'position');

      for (let index = 0; index < existingPages.length; index += 1) {
        const page = existingPages[index];
        await trx.withSchema('lingocafe').table('books_pages')
          .where({ book_id: page.book_id, id: page.id })
          .update({ position: -1000000 - index - 1 });
      }

      for (const page of pages) {
        await trx.withSchema('lingocafe').table('books_pages')
          .insert({
            book_id: book.id,
            ...page
          })
          .onConflict(['book_id', 'id'])
          .merge({
            position: page.position,
            kind: page.kind,
            prefix: page.prefix,
            title: page.title,
            summary: page.summary,
            content: page.content
          });
      }

      await trx.withSchema('lingocafe').table('books_pages')
        .where({ book_id: book.id })
        .whereNotIn('id', pages.map((page) => page.id))
        .del();
    }
  });
};
