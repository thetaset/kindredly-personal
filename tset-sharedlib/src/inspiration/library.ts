/**
 * The block page's inspiration library (HAT-1216): Kindredly's three collections, as the build
 * publishes them. `tset-client/scripts/build-inspiration-catalog.ts` reads this file, adds each
 * picture's size and content hash from `resources/inspiration/pictures/`, checks everything with
 * `sanitizeInspirationCatalog` (any warning fails the build) and writes the static catalog the
 * server serves. NOTHING IN THE APP IMPORTS THIS FILE: the app reads the published catalog, so the
 * words and pictures stay out of the extension and the phone apps.
 *
 * Adding an item, as a curator:
 *   1. A picture is free everywhere when it was made before 1931 by someone who died before 1956,
 *      or is a US government photograph (NASA, the National Park Service). Save it at most 960 px
 *      wide in resources/inspiration/pictures/, and give its source page and licence.
 *   2. Words are quoted from a real poet or writer, matched to the page of the book they come from,
 *      with the work and year. Kindredly writes none: when nothing fits, the picture stands alone.
 *      Leave out a famous line that is misattributed, or that works against what the block page
 *      encourages (reading, rest, people, making things).
 *   3. Look at the whole picture. Nothing with nudity, a statue included (the founder's rule,
 *      2026-11-20), and nothing violent: classic art has plenty of both.
 *   4. `focus` keeps the subject in a wide crop; `fit: 'contain'` with a `mat` colour shows an
 *      object photographed on a plain ground whole, never cropped.
 *   5. `about` is a line or two a child can read when they tap the picture: what it shows and why
 *      it is known, from the museum's own notes or Wikipedia, never guessed. `wikipedia` is the
 *      English article about the picture, or about its maker when it has none; words take one too.
 *   6. Save a 360 px wide copy under the same name in resources/inspiration/thumbs/, for the
 *      settings page's lists (the build fails without it).
 */
import type {
  InspirationCollection,
  InspirationPicture,
  InspirationWords,
} from './inspiration'

/** A picture as authored: a file in resources/inspiration/pictures/, without the size and hash the build adds. */
export type InspirationSourcePicture = Omit<InspirationPicture, 'path' | 'width' | 'height'> & { file: string }

export type InspirationSourceItem = {
  id: string
  collection: string
  topics: string[]
  picture?: InspirationSourcePicture
  words?: InspirationWords
}

export const INSPIRATION_COLLECTIONS: InspirationCollection[] = [
  {
    id: 'younger',
    name: 'For younger kids',
    description: 'Children playing, animals and bright color, with poems written for children.',
    topics: [
      { id: 'playing-outside', name: 'Playing outside' },
      { id: 'building', name: 'Building' },
      { id: 'animals', name: 'Animals and birds' },
      { id: 'making', name: 'Drawing and making' },
      { id: 'reading', name: 'Reading' },
      { id: 'family', name: 'Family and friends' },
      { id: 'rest', name: 'Rest' },
      { id: 'nature', name: 'Nature' },
    ],
  },
  {
    id: 'older',
    name: 'For older kids and adults',
    description: 'People reading, talking and making things, with Thoreau, Emerson and other writers.',
    topics: [
      { id: 'rethinking', name: 'Rethinking' },
      { id: 'family', name: 'Family and friends' },
      { id: 'building-hard', name: 'Building something hard' },
      { id: 'making', name: 'Making things' },
      { id: 'practice', name: 'Practice' },
      { id: 'reading', name: 'Reading' },
      { id: 'nature', name: 'Nature' },
      { id: 'rest', name: 'Rest' },
    ],
  },
  {
    id: 'photographs',
    name: 'Famous photographs',
    description: 'The first flight, the Empire State Building going up, the Earth seen from the Moon.',
    topics: [
      { id: 'building-hard', name: 'Building something hard' },
      { id: 'nature', name: 'Nature' },
      { id: 'space', name: 'Space' },
    ],
  },
]

// ── Words ─────────────────────────────────────────────────────────────────────────────────────────

const STEVENSON_VERSES = 'A Child’s Garden of Verses'

/** An English Wikipedia article, by its title as Wikipedia writes it. */
const wp = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
const VERSES_WP = wp('A Child\'s Garden of Verses')

const W = {
  seaside: { text: 'When I was down beside the sea / A wooden spade they gave to me / To dig the sandy shore.', who: 'Robert Louis Stevenson', work: `At the Sea-Side, in ${STEVENSON_VERSES}`, year: '1885', wikipedia: VERSES_WP },
  blocks: { text: 'What are you able to build with your blocks? / Castles and palaces, temples and docks.', who: 'Robert Louis Stevenson', work: `Block City, in ${STEVENSON_VERSES}`, year: '1885', wikipedia: VERSES_WP },
  happy: { text: 'The world is so full of a number of things, / I’m sure we should all be as happy as kings.', who: 'Robert Louis Stevenson', work: `Happy Thought, in ${STEVENSON_VERSES}`, year: '1885', wikipedia: VERSES_WP },
  hope: { text: '“Hope” is the thing with feathers — / That perches in the soul —', who: 'Emily Dickinson', work: 'a poem, first printed 1891', year: 'c. 1861', wikipedia: wp('"Hope" is the thing with feathers') },
  frigate: { text: 'There is no Frigate like a Book / To take us Lands away', who: 'Emily Dickinson', work: 'a poem, first printed 1894', year: 'c. 1873', wikipedia: wp('Emily Dickinson') },
  grahame: { text: 'Believe me, my young friend, there is nothing — absolutely nothing — half so much worth doing as simply messing about in boats.', who: 'Kenneth Grahame', work: 'The Wind in the Willows', year: '1908', wikipedia: wp('The Wind in the Willows') },
  wind: { text: 'Who has seen the wind? / Neither I nor you: / But when the leaves hang trembling, / The wind is passing through.', who: 'Christina Rossetti', work: 'Sing-Song', year: '1872', wikipedia: wp('Christina Rossetti') },
  ants: { text: 'It is not enough to be industrious; so are the ants. What are you industrious about?', who: 'Henry David Thoreau', work: 'a letter to H. G. O. Blake', year: '1857', wikipedia: wp('Henry David Thoreau') },
  leisure: { text: 'What is this life if, full of care, / We have no time to stand and stare.', who: 'W. H. Davies', work: 'Leisure, in Songs of Joy', year: '1911', wikipedia: wp('Leisure (poem)') },
  friend: { text: 'The only way to have a friend is to be one.', who: 'Ralph Waldo Emerson', work: 'Friendship', year: '1841', wikipedia: wp('Ralph Waldo Emerson') },
  doing: { text: 'Let us, then, be up and doing, / With a heart for any fate; / Still achieving, still pursuing, / Learn to labor and to wait.', who: 'Henry Wadsworth Longfellow', work: 'A Psalm of Life', year: '1838', wikipedia: wp('A Psalm of Life') },
  hopefully: { text: 'To travel hopefully is a better thing than to arrive, and the true success is to labour.', who: 'Robert Louis Stevenson', work: 'El Dorado, in Virginibus Puerisque', year: '1881', wikipedia: wp('Robert Louis Stevenson') },
  strokes: { text: 'Little strokes fell great oaks.', who: 'Benjamin Franklin', work: 'Poor Richard’s Almanack', year: '1750', wikipedia: wp('Poor Richard\'s Almanack') },
  bestBooks: { text: 'Read the best books first, or you may not have a chance to read them at all.', who: 'Henry David Thoreau', work: 'A Week on the Concord and Merrimack Rivers', year: '1849', wikipedia: wp('A Week on the Concord and Merrimack Rivers') },
  rest: { text: 'Rest is not idleness, and to lie sometimes on the grass under trees on a summer’s day, listening to the murmur of the water, or watching the clouds float across the blue sky, is by no means a waste of time.', who: 'John Lubbock', work: 'The Use of Life', year: '1894', wikipedia: wp('John Lubbock, 1st Baron Avebury') },
  learn: { text: 'If you are looking for perfect safety, you will do well to sit on a fence and watch the birds; but if you really wish to learn, you must mount a machine and become acquainted with its tricks by actual trial.', who: 'Wilbur Wright', work: 'Some Aeronautical Experiments, a talk', year: '1901', wikipedia: wp('Wright brothers') },
  castles: { text: 'If you have built castles in the air, your work need not be lost; that is where they should be. Now put the foundations under them.', who: 'Henry David Thoreau', work: 'Walden', year: '1854', wikipedia: wp('Walden') },
  walk: { text: 'In every walk with nature one receives far more than he seeks.', who: 'John Muir', work: 'Steep Trails', year: '1918', wikipedia: wp('John Muir') },
  snow: { text: 'How full of the creative genius is the air in which these are generated! I should hardly admire more if real stars fell and lodged on my coat.', who: 'Henry David Thoreau', work: 'his journal, about snowflakes', year: '1856', wikipedia: wp('Henry David Thoreau') },
  strive: { text: 'To strive, to seek, to find, and not to yield.', who: 'Alfred, Lord Tennyson', work: 'Ulysses', year: '1842', wikipedia: wp('Ulysses (poem)') },
  grain: { text: 'To see a World in a Grain of Sand / And a Heaven in a Wild Flower, / Hold Infinity in the palm of your hand / And Eternity in an hour.', who: 'William Blake', work: 'Auguries of Innocence, first printed 1863', year: 'c. 1803', wikipedia: wp('Auguries of Innocence') },
} satisfies Record<string, InspirationWords>

// ── Pictures ──────────────────────────────────────────────────────────────────────────────────────

const AIC_LICENCE = 'Public domain (CC0), Art Institute of Chicago'
const PD = 'Public domain'
const aic = (id: number) => `https://www.artic.edu/artworks/${id}`
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

export const INSPIRATION_LIBRARY: InspirationSourceItem[] = [
  // ── For younger kids ──
  {
    id: 'younger-holiday', collection: 'younger', topics: ['playing-outside'], words: W.seaside,
    picture: { file: 'holiday.jpg', focus: '50% 60%', title: 'A Holiday', maker: 'Edward Henry Potthast', date: 'c. 1915', source: aic(71573), licence: AIC_LICENCE,
      about: 'Edward Potthast painted children playing at the edge of the sea on a windy day. Sunny beach scenes like this were what he was best known for.',
      wikipedia: wp('Edward Henry Potthast'),
    },
  },
  {
    id: 'younger-snowball', collection: 'younger', topics: ['building', 'playing-outside'], words: W.blocks,
    picture: { file: 'snowball.jpg', focus: '50% 50%', title: 'Five Young Boys Rolling a Large Snowball', maker: 'Isoda Koryūsai', date: 'c. 1772', source: aic(22442), licence: AIC_LICENCE,
      about: 'A Japanese woodblock print from about 1772. Each color was carved into its own block of wood and printed one after another, by hand.',
      wikipedia: wp('Koryūsai'),
    },
  },
  {
    id: 'younger-jay', collection: 'younger', topics: ['animals', 'nature'], words: W.hope,
    picture: { file: 'jay.jpg', focus: '50% 40%', title: 'Florida Jay', maker: 'Robert Havell, after John James Audubon', date: '1830', source: aic(18878), licence: AIC_LICENCE,
      about: 'From The Birds of America, John James Audubon’s book of birds drawn life-size. Robert Havell engraved Audubon’s painting, and every print was colored by hand.',
      wikipedia: wp('The Birds of America'),
    },
  },
  {
    id: 'younger-murnau', collection: 'younger', topics: ['making'],
    picture: { file: 'murnau.jpg', focus: '50% 30%', title: 'Houses at Murnau', maker: 'Vasily Kandinsky', date: '1909', source: aic(129849), licence: AIC_LICENCE,
      about: 'Kandinsky painted the houses of Murnau, a small town in Bavaria near the Alps, in colors brighter than life. A few years later he was painting pictures with no houses in them at all.',
      wikipedia: wp('Wassily Kandinsky'),
    },
  },
  {
    id: 'younger-cat', collection: 'younger', topics: ['rest', 'animals'],
    picture: { file: 'cat.jpg', focus: '50% 45%', title: 'Winter: Cat on a Cushion', maker: 'Théophile-Alexandre Steinlen', date: '1909', source: aic(51719), licence: AIC_LICENCE,
      about: 'Théophile-Alexandre Steinlen loved cats and drew them again and again. In this color print, called Winter, one keeps warm on a cushion.',
      wikipedia: wp('Théophile Steinlen'),
    },
  },
  { id: 'younger-frigate', collection: 'younger', topics: ['reading'], words: W.frigate },
  {
    id: 'younger-croquet', collection: 'younger', topics: ['family', 'playing-outside'], words: W.happy,
    picture: { file: 'croquet.jpg', focus: '50% 50%', title: 'Croquet Scene', maker: 'Winslow Homer', date: '1866', source: aic(44018), licence: AIC_LICENCE,
      about: 'Croquet had only just come to America from Britain when Winslow Homer painted this game in the afternoon sun. It is one of five paintings he made of it.',
      wikipedia: wp('Winslow Homer'),
    },
  },
  {
    id: 'younger-boats', collection: 'younger', topics: ['nature', 'playing-outside'], words: W.grahame,
    picture: { file: 'boats.jpg', focus: '50% 45%', title: 'Boats on the Beach at Étretat', maker: 'Claude Monet', date: '1885', source: aic(59927), licence: AIC_LICENCE,
      about: 'Rain kept Claude Monet indoors, so he painted these fishing boats on the beach at Étretat, in France, from his hotel window.',
      wikipedia: wp('Claude Monet'),
    },
  },
  {
    id: 'younger-equestrienne', collection: 'younger', topics: ['animals'],
    picture: { file: 'equestrienne.jpg', focus: '50% 50%', fit: 'contain', mat: '#0a0a0a', title: 'Equestrienne', maker: 'Unknown maker, China, Tang dynasty', date: 'mid-8th century', source: aic(35376), licence: AIC_LICENCE,
      about: 'A woman riding her horse, shaped in clay in China about 1,300 years ago. Figures like this were placed in the tombs of wealthy families, showing the fashions and pastimes they enjoyed.',
      wikipedia: wp('Tang dynasty tomb figures'),
    },
  },
  {
    id: 'younger-lilies', collection: 'younger', topics: ['nature'], words: W.wind,
    picture: { file: 'lilies.jpg', focus: '50% 50%', title: 'Water Lily Pond', maker: 'Claude Monet', date: '1900', source: aic(87088), licence: AIC_LICENCE,
      about: 'Monet turned a marsh behind his house at Giverny, in France, into a pond with water lilies and a Japanese-style bridge. He painted it for the rest of his life.',
      wikipedia: wp('Water Lilies (Monet series)'),
    },
  },

  // ── For older kids and adults ──
  { id: 'older-ants', collection: 'older', topics: ['rethinking'], words: W.ants },
  {
    id: 'older-aquarium', collection: 'older', topics: ['rest', 'rethinking'], words: W.leisure,
    picture: { file: 'aquarium.jpg', focus: '45% 35%', title: 'Woman before an Aquarium', maker: 'Henri Matisse', date: '1921–23', source: aic(27984), licence: AIC_LICENCE,
      about: 'Henri Matisse painted this while living in Nice, in the south of France. The patterned screen behind her echoes the Islamic art he had seen on trips to Algeria and Morocco.',
      wikipedia: wp('Henri Matisse and goldfish'),
    },
  },
  {
    id: 'older-conversation', collection: 'older', topics: ['family'], words: W.friend,
    picture: { file: 'conversation.jpg', focus: '50% 24%', title: 'The Conversation', maker: 'Marcellin Desboutin', date: '1875–79', source: aic(21165), licence: AIC_LICENCE,
      about: 'Marcellin Desboutin painted and made prints in Paris, where his friends included the painters Edgar Degas and Édouard Manet.',
      wikipedia: wp('Marcellin Desboutin'),
    },
  },
  {
    id: 'older-herring', collection: 'older', topics: ['building-hard'], words: W.doing,
    picture: { file: 'herring.jpg', focus: '50% 45%', title: 'The Herring Net', maker: 'Winslow Homer', date: '1885', source: aic(25865), licence: AIC_LICENCE,
      about: 'Two fishermen haul in a net full of herring while their small boat rides the swell. Winslow Homer painted it in Prouts Neck, Maine, where he lived by the sea.',
      wikipedia: wp('Winslow Homer'),
    },
  },
  {
    id: 'older-green-center', collection: 'older', topics: ['making'],
    picture: { file: 'greencenter.jpg', focus: '50% 45%', title: 'Painting with Green Center', maker: 'Vasily Kandinsky', date: '1913', source: aic(8987), licence: AIC_LICENCE,
      about: 'Kandinsky was one of the first painters to leave out things you can name and let color and shape do the work, the way music does without words.',
      wikipedia: wp('Wassily Kandinsky'),
    },
  },
  {
    id: 'older-eye-dazzler', collection: 'older', topics: ['practice', 'making'], words: W.strokes,
    picture: { file: 'navajo.jpg', focus: '50% 50%', title: '“Germantown Eye-Dazzler” Rug', maker: 'A Navajo (Diné) weaver', date: 'by 1890', source: aic(155968), licence: AIC_LICENCE,
      about: 'Navajo (Diné) weavers made bright rugs in this style, called Eye Dazzler, in the late 1800s, with dyed yarn from Germantown, Pennsylvania. Every zigzag is woven by hand.',
      wikipedia: wp('Navajo weaving'),
    },
  },
  {
    id: 'older-reading', collection: 'older', topics: ['reading'], words: W.bestBooks,
    picture: { file: 'reading.jpg', focus: '50% 22%', title: 'Interrupted Reading', maker: 'Camille Corot', date: 'c. 1870', source: aic(81512), licence: AIC_LICENCE,
      about: 'Camille Corot was famous for his landscapes, but late in life he also painted people in his studio, like this woman looking up from her book.',
      wikipedia: wp('Jean-Baptiste-Camille Corot'),
    },
  },
  {
    id: 'older-easel', collection: 'older', topics: ['making', 'rethinking'], words: W.hopefully,
    picture: { file: 'easel.jpg', focus: '55% 35%', title: 'An Artist at His Easel', maker: 'John Singer Sargent', date: '1914', source: aic(15728), licence: AIC_LICENCE,
      about: 'A watercolor by John Singer Sargent of a painter at work outdoors. Famous for his portraits, Sargent spent his summers painting watercolors like this one.',
      wikipedia: wp('John Singer Sargent'),
    },
  },
  {
    id: 'older-lark', collection: 'older', topics: ['rest', 'nature'], words: W.rest,
    picture: { file: 'lark.jpg', focus: '50% 35%', title: 'The Song of the Lark', maker: 'Jules Breton', date: '1884', source: aic(94841), licence: AIC_LICENCE,
      about: 'A girl stops work in the fields at sunrise to listen to a lark singing. In 1934 it was voted “America’s Best Loved Picture” in a Chicago newspaper’s contest.',
      wikipedia: wp('The Song of the Lark (Jules Breton)'),
    },
  },
  {
    id: 'older-mondrian', collection: 'older', topics: ['making'],
    picture: { file: 'mondrian.jpg', focus: '50% 50%', fit: 'contain', mat: '#ebebeb', title: 'Lozenge Composition with Yellow, Black, Blue, Red, and Gray', maker: 'Piet Mondrian', date: '1921', source: aic(109819), licence: AIC_LICENCE,
      about: 'Piet Mondrian made paintings from straight black lines and a few colors, moving them until they balanced. He turned this square canvas on its corner to make a diamond.',
      wikipedia: wp('Piet Mondrian'),
    },
  },

  // ── Famous photographs ──
  {
    id: 'photo-first-flight', collection: 'photographs', topics: ['building-hard'], words: W.learn,
    picture: { file: 'wright.jpg', focus: '50% 45%', title: 'The first flight, Kitty Hawk', maker: 'John T. Daniels', date: '17 December 1903', source: commons('First_flight2.jpg'), licence: PD,
      about: 'The first flight of a powered airplane: Orville Wright at the controls, Wilbur running alongside. It lasted 12 seconds. The man who took the picture had never used a camera before.',
      wikipedia: wp('Wright Flyer'),
    },
  },
  {
    id: 'photo-empire-state', collection: 'photographs', topics: ['building-hard'], words: W.castles,
    picture: { file: 'empire.jpg', focus: '50% 38%', title: 'High on the Empire State Building, N.Y.', maker: 'Lewis Wickes Hine', date: '1930', source: aic(212128), licence: AIC_LICENCE,
      about: 'Lewis Hine followed the workers up the Empire State Building as it rose, photographing them high above New York. The building opened in 1931.',
      wikipedia: wp('Empire State Building'),
    },
  },
  {
    id: 'photo-power-house', collection: 'photographs', topics: ['building-hard'],
    picture: { file: 'powerhouse.jpg', focus: '50% 45%', title: 'Power house mechanic working on steam pump', maker: 'Lewis Wickes Hine', date: '1920', source: commons('Lewis_Hine_Power_house_mechanic_working_on_steam_pump.jpg'), licence: PD,
      about: 'Lewis Hine made “work portraits” like this to show the skilled people who build machines and keep them running. His earlier photographs of children at work helped change the laws.',
      wikipedia: wp('Lewis Hine'),
    },
  },
  {
    id: 'photo-tetons', collection: 'photographs', topics: ['nature'], words: W.walk,
    picture: { file: 'tetons.jpg', focus: '50% 50%', title: 'The Tetons and the Snake River', maker: 'Ansel Adams, for the National Park Service', date: '1942', source: commons('Adams_The_Tetons_and_the_Snake_River.jpg'), licence: PD,
      about: 'Ansel Adams took this in Grand Teton National Park, in Wyoming, for the National Park Service. In 1977 it was sent into space on the Voyager Golden Record.',
      wikipedia: wp('The Tetons and the Snake River'),
    },
  },
  {
    id: 'photo-horse-in-motion', collection: 'photographs', topics: ['nature'],
    picture: { file: 'horse.jpg', focus: '50% 50%', title: 'The Horse in Motion', maker: 'Eadweard Muybridge', date: '1878', source: commons('The_Horse_in_Motion_high_res.jpg'), licence: PD,
      about: 'Does a galloping horse ever have all four hooves off the ground? Eadweard Muybridge set up a row of cameras to find out, and it does.',
      wikipedia: wp('The Horse in Motion'),
    },
  },
  {
    id: 'photo-snowflakes', collection: 'photographs', topics: ['nature'], words: W.snow,
    picture: { file: 'snowflakes.jpg', focus: '50% 40%', title: 'Snowflakes', maker: 'Wilson A. Bentley', date: '1902', source: commons('SnowflakesWilsonBentley.jpg'), licence: PD,
      about: 'Wilson Bentley, a Vermont farmer, caught snowflakes on black velvet and photographed them through a microscope before they melted. He photographed more than 5,000.',
      wikipedia: wp('Wilson Bentley'),
    },
  },
  {
    id: 'photo-earthrise', collection: 'photographs', topics: ['space'],
    picture: { file: 'earthrise.jpg', focus: '50% 65%', title: 'Earthrise', maker: 'William Anders, NASA (Apollo 8)', date: '24 December 1968', source: commons('NASA-Apollo8-Dec24-Earthrise.jpg'), licence: PD,
      about: 'The Earth rising over the Moon, seen by the crew of Apollo 8, the first people to fly around the Moon. William Anders took it on Christmas Eve, 1968.',
      wikipedia: wp('Earthrise'),
    },
  },
  {
    id: 'photo-aldrin', collection: 'photographs', topics: ['space'], words: W.strive,
    picture: { file: 'aldrin.jpg', focus: '50% 30%', title: 'Buzz Aldrin on the Moon', maker: 'Neil Armstrong, NASA (Apollo 11)', date: 'July 1969', source: commons('Aldrin_Apollo_11_original.jpg'), licence: PD,
      about: 'Buzz Aldrin on the Moon during Apollo 11. Neil Armstrong took the picture, and you can see him and their lunar module reflected in Aldrin’s visor.',
      wikipedia: wp('Apollo 11'),
    },
  },
  {
    id: 'photo-blue-marble', collection: 'photographs', topics: ['space'],
    picture: { file: 'bluemarble.jpg', focus: '50% 50%', fit: 'contain', mat: '#000000', title: 'The Blue Marble', maker: 'Apollo 17 crew, NASA', date: '7 December 1972', source: commons('The_Earth_seen_from_Apollo_17.jpg'), licence: PD,
      about: 'The whole Earth, lit by the Sun behind the crew of Apollo 17 on their way to the Moon. It is one of the most reproduced pictures in history.',
      wikipedia: wp('The Blue Marble'),
    },
  },
  {
    id: 'photo-mccandless', collection: 'photographs', topics: ['space'],
    picture: { file: 'mccandless.jpg', focus: '50% 35%', title: 'Bruce McCandless II on the first untethered spacewalk', maker: 'NASA', date: 'February 1984', source: commons('Bruce_McCandless_II_during_EVA_in_1984.jpg'), licence: PD,
      about: 'Bruce McCandless floats free in space, tied to nothing, on the first untethered spacewalk. He steered with a jet pack called the Manned Maneuvering Unit.',
      wikipedia: wp('Bruce McCandless II'),
    },
  },
  {
    id: 'photo-pillars', collection: 'photographs', topics: ['space'], words: W.grain,
    picture: { file: 'pillars.jpg', focus: '35% 50%', title: 'Pillars of Creation, the Eagle Nebula', maker: 'NASA, Hubble Space Telescope', date: '1995', source: commons('Gas_Pillars_in_the_Eagle_Nebula_(M16)-_Pillars_of_Creation_in_a_Star-Forming_Region_(1995-44-351).tiff'), licence: PD,
      about: 'Towers of gas and dust in the Eagle Nebula, about 6,500 light-years away, where new stars are being born. The Hubble Space Telescope took it in 1995.',
      wikipedia: wp('Pillars of Creation'),
    },
  },
  {
    id: 'photo-curiosity', collection: 'photographs', topics: ['space'],
    picture: { file: 'curiosity.jpg', focus: '50% 45%', title: 'Curiosity’s self-portrait on Mars', maker: 'NASA/JPL-Caltech/MSSS', date: '31 October 2012', source: commons('PIA16239_High-Resolution_Self-Portrait_by_Curiosity_Rover_Arm_Camera.jpg'), licence: PD,
      about: 'NASA’s Curiosity rover on Mars, in a self-portrait put together from dozens of pictures taken by a camera on its arm.',
      wikipedia: wp('Curiosity (rover)'),
    },
  },
]
