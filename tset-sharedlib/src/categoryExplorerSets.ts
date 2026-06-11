import type { CategorySet } from './types/categoryExplorer.types'

const generalSet: CategorySet = {
  id: 'general',
  name: 'General',
  description: 'A broad set of categories covering most everyday content.',
  nodes: [
    {
      id: 'gen_learning',
      label: 'Learning',
      description: 'Educational material for building knowledge and skills.',
      tags: ['learning', 'education'],
      icon: 'mortarboard',
      children: [
        { id: 'gen_education', label: 'Education', description: 'Tutorials, courses, lessons, and instructional material.', tags: ['tutorial', 'lesson', 'course', 'how-to'], icon: 'book' },
        { id: 'gen_science', label: 'Science & Nature', description: 'The natural world, experiments, biology, physics, and the environment.', tags: ['science', 'nature', 'biology', 'physics', 'environment'], icon: 'flask' },
        { id: 'gen_math', label: 'Math', description: 'Arithmetic, algebra, geometry, and other mathematical topics.', tags: ['math', 'mathematics', 'algebra', 'geometry'], icon: 'calculator' },
        { id: 'gen_history', label: 'History & Culture', description: 'Historical events, civilizations, traditions, and cultures.', tags: ['history', 'culture', 'civilization'], icon: 'clock-history' },
        { id: 'gen_language', label: 'Language & Literature', description: 'Reading, writing, books, languages, and storytelling.', tags: ['books', 'reading', 'writing', 'language', 'literature'], icon: 'translate' },
      ],
    },
    {
      id: 'gen_creative',
      label: 'Creative',
      description: 'Making and enjoying art, music, and hands-on projects.',
      tags: ['creative', 'art'],
      icon: 'palette',
      children: [
        { id: 'gen_art', label: 'Art', description: 'Drawing, painting, design, and visual art.', tags: ['art', 'drawing', 'painting', 'design'], icon: 'brush' },
        { id: 'gen_music', label: 'Music', description: 'Songs, instruments, music theory, and performances.', tags: ['music', 'song', 'instrument', 'band'], icon: 'music-note-beamed' },
        { id: 'gen_diy', label: 'DIY & Crafts', description: 'Hands-on projects, crafts, and do-it-yourself guides.', tags: ['diy', 'craft', 'project', 'handmade'], icon: 'tools' },
      ],
    },
    {
      id: 'gen_entertainment',
      label: 'Entertainment & News',
      description: 'Shows, games, current events, and sports.',
      tags: ['entertainment', 'news'],
      icon: 'controller',
      children: [
        { id: 'gen_entertainment_leaf', label: 'Entertainment', description: 'Movies, shows, games, and fun content for downtime.', tags: ['entertainment', 'movie', 'show', 'game', 'fun'], icon: 'film' },
        { id: 'gen_news', label: 'News', description: 'Current events and news coverage.', tags: ['news', 'current events'], icon: 'newspaper' },
        { id: 'gen_sports', label: 'Sports', description: 'Sports news, highlights, and how-to content.', tags: ['sports', 'team', 'athlete'], icon: 'trophy' },
      ],
    },
    {
      id: 'gen_life',
      label: 'Life & Home',
      description: 'Everyday topics: health, money, food, productivity, and tech.',
      tags: ['life', 'home'],
      icon: 'house-heart',
      children: [
        { id: 'gen_health', label: 'Health & Exercise', description: 'Fitness, wellness, exercise, and healthy habits.', tags: ['health', 'exercise', 'fitness', 'wellness'], icon: 'heart-pulse' },
        { id: 'gen_food', label: 'Food & Diet', description: 'Recipes, cooking, nutrition, and diet.', tags: ['food', 'recipe', 'cooking', 'diet', 'nutrition'], icon: 'cup-hot' },
        { id: 'gen_finance', label: 'Finance', description: 'Money management, budgeting, saving, and investing.', tags: ['finance', 'money', 'budget', 'saving', 'investing'], icon: 'piggy-bank' },
        { id: 'gen_productivity', label: 'Productivity', description: 'Tools and techniques for getting things done and staying organized.', tags: ['productivity', 'organization', 'tools', 'planning'], icon: 'check2-square' },
        { id: 'gen_technology', label: 'Technology', description: 'Computers, software, gadgets, and how tech works.', tags: ['technology', 'computer', 'software', 'gadget'], icon: 'cpu' },
        { id: 'gen_shopping', label: 'Shopping', description: 'Product reviews, deals, and shopping guides.', tags: ['shopping', 'product', 'review', 'deal'], icon: 'bag' },
      ],
    },
  ],
}

const kidsSet: CategorySet = {
  id: 'kids',
  name: 'Kids',
  description: 'Simple, friendly categories for younger children.',
  minAgeGroups: ['minage_prek', 'minage_kids'],
  nodes: [
    { id: 'kid_stories', label: 'Stories & Books', description: 'Picture books, read-alongs, and storytelling for kids.', tags: ['story', 'book', 'reading', 'read-aloud'], icon: 'book' },
    { id: 'kid_learning', label: 'Letters & Numbers', description: 'Learning the alphabet, counting, shapes, and colors.', tags: ['abc', 'alphabet', 'numbers', 'counting', 'shapes', 'colors'], icon: 'alphabet' },
    { id: 'kid_songs', label: 'Music & Songs', description: 'Sing-along songs, nursery rhymes, and music for kids.', tags: ['song', 'music', 'nursery rhyme', 'sing-along'], icon: 'music-note-beamed' },
    { id: 'kid_art', label: 'Art & Crafts', description: 'Coloring, drawing, and simple craft projects.', tags: ['art', 'craft', 'coloring', 'drawing'], icon: 'palette' },
    { id: 'kid_animals', label: 'Animals & Nature', description: 'Animals, plants, and the natural world.', tags: ['animal', 'nature', 'plant', 'pet', 'zoo'], icon: 'tree' },
    { id: 'kid_play', label: 'Games & Fun', description: 'Games, cartoons, and playful entertainment for kids.', tags: ['game', 'cartoon', 'play', 'fun'], icon: 'joystick' },
  ],
}

const teensSet: CategorySet = {
  id: 'teens',
  name: 'Teens',
  description: 'Categories tailored to pre-teens and teenagers.',
  minAgeGroups: ['minage_preteen', 'minage_teen'],
  nodes: [
    {
      id: 'teen_school',
      label: 'School & Homework',
      description: 'Subjects and study help for school.',
      tags: ['school', 'homework', 'study'],
      icon: 'mortarboard',
      children: [
        { id: 'teen_math_science', label: 'Math & Science', description: 'Math, biology, chemistry, and physics help.', tags: ['math', 'science', 'biology', 'chemistry', 'physics'], icon: 'flask' },
        { id: 'teen_writing', label: 'Writing & Literature', description: 'Essays, books, grammar, and literary analysis.', tags: ['writing', 'literature', 'essay', 'grammar', 'book'], icon: 'pencil' },
        { id: 'teen_social_studies', label: 'History & Social Studies', description: 'History, geography, civics, and current events for school.', tags: ['history', 'geography', 'civics', 'social studies'], icon: 'globe2' },
      ],
    },
    {
      id: 'teen_hobbies',
      label: 'Hobbies & Interests',
      description: 'Gaming, music, sports, and creative pursuits.',
      tags: ['hobby', 'interest'],
      icon: 'controller',
      children: [
        { id: 'teen_gaming', label: 'Gaming', description: 'Video games, walkthroughs, and gaming culture.', tags: ['gaming', 'video game', 'walkthrough', 'esports'], icon: 'joystick' },
        { id: 'teen_music', label: 'Music', description: 'Artists, playlists, and learning instruments.', tags: ['music', 'artist', 'playlist', 'instrument'], icon: 'music-note-beamed' },
        { id: 'teen_sports', label: 'Sports', description: 'Sports highlights, training tips, and fandom.', tags: ['sports', 'training', 'team', 'athlete'], icon: 'trophy' },
        { id: 'teen_art_design', label: 'Art & Design', description: 'Drawing, digital art, fashion, and design.', tags: ['art', 'design', 'drawing', 'fashion'], icon: 'palette' },
      ],
    },
    {
      id: 'teen_life_skills',
      label: 'Life Skills',
      description: 'Practical skills for becoming more independent.',
      tags: ['life skills'],
      icon: 'house-heart',
      children: [
        { id: 'teen_finance', label: 'Money & Finance', description: 'Budgeting, saving, and understanding money.', tags: ['money', 'finance', 'budget', 'saving'], icon: 'wallet2' },
        { id: 'teen_health', label: 'Health & Fitness', description: 'Exercise, nutrition, and mental wellness.', tags: ['health', 'fitness', 'exercise', 'nutrition', 'wellness'], icon: 'heart-pulse' },
        { id: 'teen_tech', label: 'Tech & Coding', description: 'Programming, apps, and how technology works.', tags: ['tech', 'coding', 'programming', 'app', 'computer'], icon: 'laptop' },
      ],
    },
    { id: 'teen_news_culture', label: 'News & Culture', description: 'Current events, trends, and pop culture.', tags: ['news', 'culture', 'trend', 'pop culture'], icon: 'newspaper' },
  ],
}

export const DefaultCategorySets: CategorySet[] = [generalSet, kidsSet, teensSet]
