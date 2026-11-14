/**
 * Prism core + the languages Quick Notes code cards highlight. Loaded only through a dynamic
 * import from components/learning/NoteContent.tsx, so it is split out of the Home bundle.
 * (Side-effect imports: the language files register themselves on the Prism global.)
 */
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

export default Prism;
