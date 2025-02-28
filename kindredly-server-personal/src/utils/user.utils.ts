import User from "@/schemas/public/User";

// Family-friendly adjective and noun word lists
const adjectives = [
  'happy', 'bright', 'calm', 'brave', 'kind', 'smart', 'shiny', 'silly', 'wise', 'gentle',
  'lively', 'breezy', 'fancy', 'glowing', 'mighty', 'friendly', 'curious', 'funny', 'witty', 'playful',
  'jolly', 'bubbly', 'bouncy', 'zany', 'dizzy', 'dandy', 'dapper', 'dashing', 'dazzling', 'delightful',
  'divine', 'dizzy', 'dreamy', 'eager', 'easy', 'elegant', 'enchanting', 'energetic', 'enthusiastic',
  'excellent', 'exciting', 'exuberant', 'fair', 'faithful', 'fantastic', 'fashionable', 'festive', 'fine',
];

const nouns = [
  'panda', 'tiger', 'dolphin', 'butterfly', 'koala', 'bunny', 'whale', 'puppy', 'kitten', 'owl',
  'lion', 'squirrel', 'otter', 'fox', 'zebra', 'robin', 'unicorn', 'dragon', 'penguin', 'deer', 'seal',
  'parrot', 'giraffe', 'elephant', 'monkey', 'frog', 'turtle', 'kangaroo', 'hippo', 'bear', 'wolf', 'cheetah',
  'jaguar', 'rhino', 'gorilla', 'ant', 'bee', 'butterfly', 'caterpillar', 'cricket', 'dragonfly', 'firefly',
  'grasshopper', 'ladybug', 'mosquito', 'moth', 'scorpion', 'spider', 'snail', 'wasp', 'beetle',
  'centipede', 'cockroach', 'crab', 'lobster', 'octopus', 'scorpion', 'shrimp', 'snail', 'squid', 'starfish',
  'worm', 'antelope', 'bat', 'camel', 'cow', 'deer', 'donkey', 'elephant', 'giraffe', 'goat', 'hippo', 'horse',
  'kangaroo', 'koala', 'lion', 'monkey', 'panda', 'pig', 'rabbit', 'sheep', 'squirrel', 'zebra', 'albatross',
  'canary', 'cardinal', 'chickadee', 'chicken', 'crow', 'dove', 'duck', 'eagle',
];

const invalidUsernameChars = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,<>\/?~]/;
// must not contain more than one consecutive period or underscore
const invalidUsernameChars2 = /[\._]{2,}/;
// must start with a letter
const invalidUsernameChars3 = /^[^a-zA-Z]/;
// must not end with a period or underscore
const invalidUsernameChars4 = /[._]$/;

const emailReg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

export function checkEmail(emailSt) {
  if (!emailReg.test(emailSt)) {
    throw new Error("This doesn't appear to be a valid email address: " + emailSt);
  }

  // Email is of correct length
  if (emailSt && emailSt.length > 200) {
    throw new Error('Email is too long');
  }
  if (emailSt && emailSt.length < 6) {
    throw new Error('Email is too short');
  }
}

export function checkUserName(username: string) {
  if (!username || username.length < 6) {
    throw new Error(
      "Username isn't long enough. Must be at least 6 characters"
    );
  } else if (username && username.length > 200) {
    throw new Error("Username  is too long characters");
  } else if (invalidUsernameChars.test(username)) {
    throw new Error("Usernames should only contain alphanumeric characters.");
  }
  else if (invalidUsernameChars2.test(username)) {
    throw new Error("Usernames should not contain more than one consecutive period or underscore");
  }
  else if (invalidUsernameChars3.test(username)) {
    throw new Error("Usernames should start with a letter");
  }
  else if (invalidUsernameChars4.test(username)) {
    throw new Error("Usernames should not end with a period or underscore");
  }
  else if (username && username != username.toLowerCase()) {
    throw new Error("Usernames must be lowercase");
  }
}

export function checkDisplayedName(name: string) {
  if (!name || name.length < 3 || name.length > 12) {
    throw new Error(
      "Displayed Name isn't long enough. Must be at least 3 characters and less than 12 characters"
    );
  }
}
// Function to generate a random username
export function generateUsernameAndDisplayedName() {
  // Randomly choose an adjective and noun
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  // Optionally add a period or underscore between the words
  const separator = '.';
  // Optionally add a random number for uniqueness (optional numbers 1-99)
  const number = Math.floor(Math.random() * 9999) + 1;

  // Combine parts into a username
  const username = `${adjective}${separator}${noun}${separator}${number}`;

  const displayedName = `${adjective.charAt(0).toUpperCase() + adjective.slice(1)}${noun.charAt(0).toUpperCase() + noun.slice(1)}`;

  return { username, displayedName };
}
export interface BasicFriendInfo {
  userId: string;
  username: string;
  email: string;
  profileImage: Record<string, any>;
}

export function filterBasicFriendInfo(users: User[]) {
  const friends: BasicFriendInfo[] = [];
  for (const user of users) {
    friends.push({
      userId: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
    });
  }
  return friends;
}
export const DEFAULT_OPTIONS = {
  whitelistingEnabled: false,
  codeInjectionEnabled: true,
  logActivity: false,
};

