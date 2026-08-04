export const STOP_WORDS = new Set([
  // Common English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
  'in', 'on', 'at', 'by', 'to', 'of', 'with', 'from', 'into', 'onto',
  'upon', 'out', 'off', 'over', 'under', 'up', 'down', 'through', 'between',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'he', 'she', 'him', 'her', 'his', 'hers', 'we', 'us', 'our', 'you', 'your',
  'i', 'me', 'my', 'myself', 'yourself', 'himself', 'herself', 'itself',
  'who', 'whom', 'whose', 'which', 'what', 'where', 'when', 'why', 'how',
  'all', 'each', 'every', 'any', 'some', 'no', 'none', 'one', 'two', 'other',
  'such', 'more', 'most', 'less', 'least', 'few', 'many', 'much', 'several',
  'here', 'there', 'now', 'then', 'once', 'again', 'ever', 'never', 'always',
  'often', 'still', 'already', 'soon', 'later', 'today', 'tomorrow', 'yesterday',
  'about', 'after', 'before', 'during', 'since', 'until', 'while', 'because',
  'if', 'unless', 'although', 'though', 'even', 'whether', 'as', 'like',

  // Email-specific
  're', 'fwd', 'fw', 'sent', 'from', 'subject', 'cc', 'bcc', 'reply', 'replied',
  'forwarded', 'original', 'message', 'wrote', 'said', 'email', 'mail',
  'please', 'thanks', 'thank', 'regards', 'hi', 'hello', 'hey', 'dear',
  'best', 'sincerely', 'cheers', 'attached', 'attachment', 'see', 'below',

  // Email domains and services
  'gmail', 'outlook', 'microsoft', 'yahoo', 'hotmail', 'ucsd', 'edu',
  'com', 'org', 'net', 'gov', 'mailto', 'http', 'https', 'www',

  // Meeting-specific
  'meeting', 'invite', 'invitation', 'accepted', 'declined', 'tentative',
  'teams', 'zoom', 'webex', 'call', 'join', 'dial', 'conference', 'calendar',
  'scheduled', 'rescheduled', 'cancelled', 'canceled', 'recurring', 'series',
  'agenda', 'minutes', 'notes', 'attendee', 'attendees', 'organizer',

  // Time-related
  'am', 'pm', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'january', 'february', 'march', 'april', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'week', 'month', 'year', 'day', 'hour', 'time', 'date',

  // Common verbs/fillers
  'get', 'got', 'getting', 'go', 'going', 'went', 'gone', 'come', 'coming',
  'came', 'make', 'made', 'making', 'take', 'took', 'taking', 'know', 'knew',
  'knowing', 'think', 'thought', 'thinking', 'want', 'wanted', 'wanting',
  'look', 'looked', 'looking', 'use', 'used', 'using', 'find', 'found',
  'give', 'gave', 'giving', 'tell', 'told', 'telling', 'work', 'working',
  'let', 'lets', 'put', 'keep', 'kept', 'set', 'seem', 'seemed', 'help',
  'show', 'showed', 'try', 'tried', 'ask', 'asked', 'need', 'needed',
  'feel', 'felt', 'become', 'became', 'leave', 'left', 'call', 'called',
  'first', 'last', 'next', 'new', 'old', 'good', 'great', 'right', 'well',
  'way', 'thing', 'things', 'something', 'anything', 'nothing', 'everything',
  'someone', 'anyone', 'everyone', 'people', 'person', 'part', 'place',
]);
