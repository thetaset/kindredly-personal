// The three voices a learning track is written in (docs/trackers/learning-tracks-tracker.md, TRK-13).
//
// The founder approved these samples on 2026-09-24 and chose Story first as the default. The writer
// imitates the chosen voice's sample, which matters more than any rule in the prompt, and the critic
// scores against it. The texts are copied from the tracker's "Voice samples" section, word for word;
// `track-voices.test.ts` checks they still match it. Source: Wikipedia, "Great Stink", revision
// 1375018319 (CC BY-SA 4.0).

import type { TrackVoiceKey } from './track';

export interface TrackVoice {
  key: TrackVoiceKey;
  /** The name on the Describe step. */
  name: string;
  /** One line under the name. */
  description: string;
  sample: { title: string; body: string };
}

export const DEFAULT_TRACK_VOICE: TrackVoiceKey = 'story';

export const TRACK_VOICES: TrackVoice[] = [
  {
    key: 'story',
    name: "Story first",
    description: "Starts with a moment and builds to why it matters.",
    sample: {
      title: "The summer the river stank Parliament into action",
      body: "In the summer of 1858, Queen Victoria and Prince Albert set out on the River Thames for a pleasure cruise. Within a few minutes they were back on shore. The smell was too much.\n\nLondon had been emptying its sewers straight into the Thames for years. The city had grown from just under one million people to three million, and flushing toilets sent ever more waste into drains that ended in the river. Three years earlier, the scientist Michael Faraday had dropped scraps of white paper into the water to see how murky it was. “The whole river,” he wrote to The Times, “was for the time a real sewer.”\n\nThen came a heatwave. In June the temperature in the shade averaged 34 to 36 °C. The river dropped, and raw sewage was left on its banks in the heat. The newspapers named it the Great Stink.\n\nInside the Houses of Parliament, beside the river, the curtains were soaked in lime chloride to block the smell. It didn’t work. Members talked about moving the government to Oxford. One newspaper described Benjamin Disraeli leaving a committee room with a mass of papers in one hand and his handkerchief held to his nose.\n\nThe fear went deeper than disgust. Most people believed diseases like cholera spread through bad air, and cholera had already killed more than 30,000 Londoners in three outbreaks. So Parliament moved quickly. A law passed on 2 August 1858 let the city borrow £3 million to fix its drains.\n\nThe engineer Joseph Bazalgette built what the money paid for: 82 miles of main sewers, fed by 1,100 miles of street sewers, carrying the city’s waste east and out beyond London. It took until 1875 and 318 million bricks.\n\nHere is the turn. The smell never spread cholera; dirty water did, as the doctor John Snow had argued in 1849. But by carrying the sewage away, Bazalgette’s sewers ended the outbreaks anyway. London’s last one, in 1866, struck mostly a part of the East End that had not yet been connected.\n\nHis sewers still run beneath London today.",
    },
  },
  {
    key: 'direct',
    name: "Straight to the point",
    description: "Says the idea first, then shows the evidence.",
    sample: {
      title: "The right fix, for the wrong reason",
      body: "In 1858, London’s government finally agreed to rebuild the city’s sewers. What pushed it over the line was not a disease but a smell.\n\nFor years the sewers had emptied straight into the River Thames. As the city grew to three million people and flushing toilets spread, more and more waste ended up in the river. In the hot summer of 1858 the water level dropped, and raw sewage was left exposed on the banks. The press called it the Great Stink.\n\nParliament sits on the river. The curtains on that side of the building were soaked in lime chloride to block the smell, and when that failed, members discussed moving the government to Oxford. On 2 August a new law passed, letting London borrow £3 million to fix its drains. The Times wrote that Parliament had been all but forced to act “by the force of sheer stench”.\n\nWhy the urgency? Most Victorians believed that diseases like cholera spread through foul air, an idea called miasma theory. Cholera had killed more than 30,000 Londoners in three outbreaks since 1831. If bad air carried the disease, a stinking river was a deadly one.\n\nThe belief was wrong. In 1849 a doctor named John Snow had argued that cholera spreads through contaminated water, but few people paid attention.\n\nThe engineer Joseph Bazalgette’s sewers worked anyway. His 82 miles of main sewers, fed by 1,100 miles of street sewers, sloped gently east and carried the waste to outfalls beyond the city, instead of leaving it on the riverbanks in the middle of London. Pumping stations lifted sewage out of the lowest areas so that gravity could do the rest.\n\nThe proof came in 1866. Cholera struck again, but 93 per cent of the deaths were in one part of the East End that was not yet connected to the new sewers. Investigators traced it to a water company whose sewage was being carried back into its own reservoir by the tide. That outbreak convinced doctors that cholera travels in water, and it was London’s last.\n\nSo the sewers were built to stop a smell, and they stopped a disease. They still carry London’s waste today.",
    },
  },
  {
    key: 'curious',
    name: "Friendly and curious",
    description: "Talks with you, asks questions, and ends on a thought to keep.",
    sample: {
      title: "How a smell cleaned up London",
      body: "Picture a heatwave with no air conditioning, in a city of three million people whose sewers empty into the river running through the middle of it. That was London in the summer of 1858.\n\nThe river was the Thames, and it had been getting worse for years. Three summers earlier, the scientist Michael Faraday tried a simple test: he dropped scraps of white paper into the water to see how murky it was. His verdict, in a letter to The Times? “The whole river was for the time a real sewer.”\n\nIn June 1858 the temperature in the shade averaged 34 to 36 °C. The river dropped, and the sewage it usually carried away was left sitting on the banks. The newspapers called it the Great Stink. Queen Victoria and Prince Albert tried a boat trip and were back on shore within a few minutes.\n\nNow, who works right beside the river? Parliament. Its curtains were soaked in lime chloride to block the smell. (It didn’t work.) Members talked about moving the whole government to Oxford, and Benjamin Disraeli was seen leaving a committee room with his handkerchief to his nose.\n\nWhat made the smell frightening, not just disgusting, was that most people believed diseases like cholera travelled through bad air. Cholera had already killed more than 30,000 Londoners. So Parliament did something it had been debating for two years: by 2 August it had passed a law letting London borrow £3 million for new sewers.\n\nThe engineer Joseph Bazalgette designed them to carry the waste east, out beyond the city. It took until 1875, 1,100 miles of street sewers and 318 million bricks.\n\nAnd the bad-air idea? Wrong. Cholera spreads through dirty water. But the new sewers took the city’s waste away anyway, and London’s cholera outbreaks stopped. The last one, in 1866, hit a part of the East End that wasn’t yet connected.\n\nWhich leaves a question worth sitting with: would they have built it at all if it hadn’t smelled?",
    },
  },
];

export function getTrackVoice(key: string | null | undefined): TrackVoice {
  return TRACK_VOICES.find((v) => v.key === key) || TRACK_VOICES[0];
}
