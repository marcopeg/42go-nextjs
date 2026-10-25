const books = [
{
  "id": "el-mundo-del-deporte-20-grandes-juegos-de-equipo-y-pelota-vol-1-es-a2",
  "project": "sports-01",
  "lang": "es",
  "level": "a2",
  "title": "El mundo del deporte: 20 grandes juegos de equipo y pelota, Vol. 1",
  "description": "Descubre veinte deportes fascinantes en una edición adaptada para estudiantes de nivel CEFR A2.",
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
    "words_count": 952
  },
  "published_at": "2026-10-25T09:00:00.000Z",
  "questionnaireSql": null,
  "pages": [
    {
      "id": "part_01",
      "position": 1,
      "kind": "part",
      "prefix": "Parte 1",
      "title": "The Global Pitches",
      "summary": "Association football, rugby union, American football, cricket, and Gaelic football.",
      "content": null
    },
    {
      "id": "part_01-ch_01",
      "position": 2,
      "kind": "chapter",
      "prefix": "Capítulo 1",
      "title": "Fútbol: El deporte rey",
      "summary": "From dusty dirt alleys to monumental cathedrals of sport, association football unites billions across cultures. Eleven players, ninety minutes, and a single ball create an unpredictable theater of collective geometry and individual brilliance.",
      "content": "El fútbol es la pasión deportiva definitiva que paraliza ciudades enteras. Once futbolistas por bando disputan cada metro de césped durante noventa minutos con un objetivo común: introducir el balón en la portería rival sin usar las manos. La Copa Mundial de la FIFA corona a los mejores talentos en un espectáculo seguido por miles de millones."
    },
    {
      "id": "part_01-ch_02",
      "position": 3,
      "kind": "chapter",
      "prefix": "Capítulo 2",
      "title": "Rugby: Fuerza, melés y nobleza",
      "summary": "Born at England's Rugby School when William Webb Ellis picked up the ball, rugby combines ferocious physical collisions with gentlemanly honor. Fifteen players advance an oval ball through backward passes, scrums, and diving tries.",
      "content": "El rugby combina colisiones demoledoras con un código de honor ejemplar. Quince jugadores por equipo disputan ochenta minutos de batalla física donde el balón ovalado solo puede avanzar mediante pases hacia atrás o patadas. Las melés y los ensayos representan la culminación del esfuerzo colectivo y el compañerismo."
    },
    {
      "id": "part_01-ch_03",
      "position": 4,
      "kind": "chapter",
      "prefix": "Capítulo 3",
      "title": "Fútbol americano: Estrategia en la yarda",
      "summary": "Played on a hundred-yard field divided by white chalk lines, American football is high-speed tactical chess with armored gladiators. Quarterbacks read defensive blitzes to gain ten yards in four downs on the road to touchdowns.",
      "content": "El fútbol americano es una mezcla única de fuerza explosiva y sofisticada estrategia militar. Once jugadores equipados con cascos y corazas intentan avanzar diez yardas en cuatro intentos mediante carreras potentes y pases aéreos milimétricos. La gran final del Super Bowl reúne a millones de fanáticos."
    },
    {
      "id": "part_01-ch_04",
      "position": 5,
      "kind": "chapter",
      "prefix": "Capítulo 4",
      "title": "Críquet: Tradición, bates y postigos",
      "summary": "Played with flat willow bats and cork leather balls on circular ovals, cricket is revered across India, England, Australia, and the Caribbean. Batters defend wooden wickets from bowlers hurling balls at ninety miles per hour.",
      "content": "El críquet apasiona a miles de millones de personas desde Londres hasta Mumbai. El lanzador arroja la bola de cuero hacia el 'wicket' defendido por el bateador con un bate plano de madera de sauce. Desde partidos épicos de cinco días hasta formatos rápidos de tres horas, el críquet es una cátedra de técnica y estrategia."
    },
    {
      "id": "part_01-ch_05",
      "position": 6,
      "kind": "chapter",
      "prefix": "Capítulo 5",
      "title": "Fútbol gaélico: Pasión celta",
      "summary": "Deeply woven into Irish identity, Gaelic football features fifteen players per side playing with a spherical leather ball on large pitches. Players can carry the ball four steps before bouncing or 'soloing' it with the toe.",
      "content": "El fútbol gaélico es el deporte tradicional más arraigado de Irlanda. Dos equipos de quince jugadores compiten corriendo, pateando y palmeando el balón con el puño cerrado. Para avanzar con el balón hay que botarlo o dar toques con la puntera del pie, buscando anotar en porterías coronadas por postes altos."
    },
    {
      "id": "part_02",
      "position": 7,
      "kind": "part",
      "prefix": "Parte 2",
      "title": "The Courts & Rings",
      "summary": "Basketball, indoor volleyball, European handball, water polo, and netball.",
      "content": null
    },
    {
      "id": "part_02-ch_06",
      "position": 8,
      "kind": "chapter",
      "prefix": "Capítulo 6",
      "title": "Baloncesto: Vuelo hacia el aro",
      "summary": "Invented by James Naismith in 1891 with peach baskets and a soccer ball, basketball has evolved into a global spectacle of high-flying athleticism and rapid-fire tactical scoring ten feet above the hardwood.",
      "content": "Inventado en 1891 por James Naismith, el baloncesto cautiva por su dinamismo continuo en la cancha. Equipos de cinco jugadores combinan velocidad, regates y saltos prodigiosos para encestar en un aro suspendido a más de tres metros. El tiro de tres puntos y el contragolpe rápido definen el juego moderno."
    },
    {
      "id": "part_02-ch_07",
      "position": 9,
      "kind": "chapter",
      "prefix": "Capítulo 7",
      "title": "Voleibol: El arte del remate",
      "summary": "Separated by a net over eight feet high, volleyball teams must never let the ball touch the court floor. With only three touches allowed, teams coordinate the bump, set, and spike with aerial precision.",
      "content": "El voleibol exige una sincronización perfecta donde ningún fallo de concentración queda impune. Dos equipos de seis integrantes defienden su campo sobre el suelo mediante recepciones de antebrazo, colocaciones suaves y remates demoledores por encima de la red. La modalidad sobre arena de playa potencia la resistencia física."
    },
    {
      "id": "part_02-ch_08",
      "position": 10,
      "kind": "chapter",
      "prefix": "Capítulo 8",
      "title": "Balonmano: Salto, potencia y defensa",
      "summary": "Enormously popular across Scandinavia and Central Europe, handball features seven players per side passing at breakneck speed. Shooters leap through the air above the six-meter goal crease to fire resin-coated balls past goalkeepers.",
      "content": "El balonmano destaca por su ritmo vertiginoso y sus intensos duelos corporales. Seis jugadores de campo y un portero por equipo combinan potencia de salto y lanzamientos imparables desde fuera del área de seis metros. Los porteros se lucen con paradas inverosímiles a quemarropa."
    },
    {
      "id": "part_02-ch_09",
      "position": 11,
      "kind": "chapter",
      "prefix": "Capítulo 9",
      "title": "Waterpolo: Duelo en aguas profundas",
      "summary": "Often called the most physically exhausting sport on earth, water polo players must tread water in a deep two-meter pool for four eight-minute quarters while wrestling defenders and passing a yellow ball with one hand.",
      "content": "El waterpolo exige una fortaleza pulmonar y muscular sobrehumana. En una piscina profunda de más de dos metros, siete nadadores por equipo se disputan un balón amarillo con una sola mano mientras mantienen la flotación continua con las piernas. La batalla física bajo el agua es titánica."
    },
    {
      "id": "part_02-ch_10",
      "position": 12,
      "kind": "chapter",
      "prefix": "Capítulo 10",
      "title": "Netball: Precisión sin rebotes",
      "summary": "Prominent throughout the Commonwealth, netball resembles basketball without backboards or dribbling. Seven players with strict positional bibs pass the ball within three seconds to create clear shots into a bare ring.",
      "content": "El netball prescinde del bote del balón y del tablero trasero de la canasta, exigiendo tiros limpios y precisos. Siete jugadoras por bando ocupan posiciones designadas en la pista, debiendo pasar el balón en menos de tres segundos tras frenar en seco. La velocidad de pase y el desmarque son vitales."
    },
    {
      "id": "part_03",
      "position": 13,
      "kind": "part",
      "prefix": "Parte 3",
      "title": "The Rackets & Bats",
      "summary": "Lawn tennis, feather badminton, table tennis, indoor squash, and baseball.",
      "content": null
    },
    {
      "id": "part_03-ch_11",
      "position": 14,
      "kind": "chapter",
      "prefix": "Capítulo 11",
      "title": "Tenis: Duelos de saques y tierra batida",
      "summary": "Dating from medieval royal courtyards, modern lawn tennis pits two solo gladiators across a low net. Topspin groundstrokes, sliced drop shots, and serves topping two hundred kilometers per hour create psychological duels.",
      "content": "El tenis es un duelo épico donde la mente cuenta tanto como el físico. Golpeando la pelota con efectos endiablados de 'topspin' y rebanadas cortadas, los tenistas buscan las líneas a velocidades de vértigo. Los torneos de Grand Slam coronan a los grandes mitos sobre hierba, tierra batida o pista rápida."
    },
    {
      "id": "part_03-ch_12",
      "position": 15,
      "kind": "chapter",
      "prefix": "Capítulo 12",
      "title": "Bádminton: El vuelo del volante",
      "summary": "Badminton is the fastest racket sport in the world, with shuttlecocks clocked at over 400 km/h. Players sprint and lunge across a court to keep a conical feathered projectile in the air.",
      "content": "El bádminton sorprende por la velocidad supersónica de sus golpes. El volante de plumas de oca alcanza más de cuatrocientos kilómetros por hora tras el impacto para luego frenar en el aire, exigiendo reflejos felinos y una agilidad descomunal para devolver remates rasantes sobre la red."
    },
    {
      "id": "part_03-ch_13",
      "position": 16,
      "kind": "chapter",
      "prefix": "Capítulo 13",
      "title": "Tenis de mesa: Velocidad y efectos",
      "summary": "Separated by only nine feet of blue or green table, table tennis players strike a lightweight celluloid ball spinning at up to 150 revolutions per second, reacting in less than a quarter of a second.",
      "content": "El tenis de mesa desafía la percepción humana con intercambios a corta distancia. La diminuta bola de plástico gira a cientos de revoluciones por segundo gracias al caucho de las palas. Los jugadores responden a saques con efectos imposibles y remates fulgurantes en décimas de segundo."
    },
    {
      "id": "part_03-ch_14",
      "position": 17,
      "kind": "chapter",
      "prefix": "Capítulo 14",
      "title": "Squash: Intensidad entre cuatro paredes",
      "summary": "Confined inside a four-walled room, two squash players share the same physical court space, striking a small hollow rubber ball against plaster and glass walls at blistering aerobic intensity.",
      "content": "El squash encierra a dos rivales en una pista cerrada donde comparten el mismo espacio físico. La pequeña pelota de goma negra se golpea contra la pared frontal por encima de una chapa metálica, obligando a carreras continuas de aceleración y freno en un duelo aeróbico sin tregua."
    },
    {
      "id": "part_03-ch_15",
      "position": 18,
      "kind": "chapter",
      "prefix": "Capítulo 15",
      "title": "Béisbol: El diamante y el jonrón",
      "summary": "Known as America's pastime and revered in Japan and Latin America, baseball unfolds on a diamond of four bases. Batters seek to hit a leather-stitched ball launched at 100 mph to circle the bases.",
      "content": "El béisbol es el pasatiempo rey en Norteamérica, el Caribe y Japón. El lanzador desafía al bateador con bolas rápidas y curvas engañosas desde el montículo. Conectar la pelota con el bate de madera y enviarla fuera del estadio en un cuadrangular o jonrón es una de las mayores hazañas deportivas."
    },
    {
      "id": "part_04",
      "position": 19,
      "kind": "part",
      "prefix": "Parte 4",
      "title": "Sticks, Ice & Turf",
      "summary": "Ice hockey, Olympic field hockey, Scandinavian floorball, golf, and lacrosse.",
      "content": null
    },
    {
      "id": "part_04-ch_16",
      "position": 20,
      "kind": "chapter",
      "prefix": "Capítulo 16",
      "title": "Hockey sobre hielo: Furia en la pista",
      "summary": "Gliding on razor-sharp steel blades at thirty miles per hour, ice hockey players slap a frozen vulcanized rubber puck across enclosed rinks, combining bone-crushing checks with surgical stickhandling.",
      "content": "El hockey sobre hielo desata pasiones por su rapidez vertiginosa sobre la pista congelada. Seis patinadores por equipo persiguen un disco de caucho negro a velocidades supersónicas, alternando choques imponentes contra la valla protectora y disparos de muñeca hacia la red."
    },
    {
      "id": "part_04-ch_17",
      "position": 21,
      "kind": "chapter",
      "prefix": "Capítulo 17",
      "title": "Hockey sobre hierba: Destreza en el césped",
      "summary": "An Olympic staple played on watered synthetic turf, field hockey requires players to use only the flat side of hooked sticks to dribble a hard plastic ball and score within a semicircular striking circle.",
      "content": "El hockey sobre hierba destaca por su refinada técnica sobre césped sintético mojado. Los jugadores manejan la bola dura únicamente con la cara plana del 'stick', realizando regates aéreos y combinaciones rápidas que culminan en el emocionante penalti-córner."
    },
    {
      "id": "part_04-ch_18",
      "position": 22,
      "kind": "chapter",
      "prefix": "Capítulo 18",
      "title": "Floorball: Agilidad nórdica en pista",
      "summary": "Invented in Sweden in the 1970s, floorball is a high-speed indoor team sport played with lightweight carbon sticks and a perforated plastic ball inside a 50cm barrier rink.",
      "content": "El floorball es un deporte de pista cubierto nacido en Escandinavia que premia la agilidad sin agresividad. Se juega con palos de fibra ultraligeros y una bola hueca de plástico perforada, destacando por transiciones fulgurantes y paradas acrobáticas del portero sin stick."
    },
    {
      "id": "part_04-ch_19",
      "position": 23,
      "kind": "chapter",
      "prefix": "Capítulo 19",
      "title": "Golf: Precisión en el green",
      "summary": "Born on the windswept Scottish coast of St Andrews, golf is a solitary duel between player, club, and landscape. Across eighteen manicured holes, players strive to sink a dimpled ball with the fewest strokes.",
      "content": "El golf combina comunión con la naturaleza y concentración absoluta. A lo largo de dieciocho hoyos salpicados de lagos y trampas de arena, los golfistas calibran la fuerza y el viento para colocar la bola en el 'green' y embocarla con un golpe suave de 'putter'."
    },
    {
      "id": "part_04-ch_20",
      "position": 24,
      "kind": "chapter",
      "prefix": "Capítulo 20",
      "title": "Lacrosse: Velocidad con red y bastón",
      "summary": "Played by Native American nations for centuries as a sacred ritual of healing and preparation, lacrosse is the oldest sport in North America. Players cradle a solid rubber ball in mesh sticks, firing shots at 100 mph.",
      "content": "El lacrosse es el deporte autóctono más antiguo de Norteamérica, practicado antaño por pueblos indígenas como entrenamiento espiritual y físico. Con un 'stick' provisto de una red en el extremo, los jugadores corren protegiendo la bola de goma para rematar con potencia contra la meta."
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
