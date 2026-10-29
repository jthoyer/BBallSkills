import { pageHeader, suggestControl } from '../ui.js';

export function aboutView() {
  return {
    title: 'About',
    html: `
      ${pageHeader({ title: 'About', lead: 'Free basketball skill videos for players aged 10 to 15, their parents and their coaches.' })}
      <section class="blk" aria-labelledby="ab-use">
        <h2 id="ab-use">How to use this site</h2>
        <ol class="steps">
          <li>Pick a skill on the Skills tab, or your position on the Positions tab.</li>
          <li>Tap a drill and press play. Watch it once all the way through.</li>
          <li>Read the cues, then do the &ldquo;Do it&rdquo; line.</li>
        </ol>
        <p>Each drill has a level: Beginner, Intermediate or Advanced. We grade the levels ourselves. They are not the video makers' grades.</p>
      </section>
      <section class="blk" aria-labelledby="ab-videos">
        <h2 id="ab-videos">Where the videos come from</h2>
        <p>Every video is a public YouTube video made by someone else, and the channel is credited on each drill page. We do not host or make any footage.</p>
        <p>The thumbnail picture comes from YouTube's image server, so YouTube can see your device asked for it. The video itself loads from youtube-nocookie.com only after you press play.</p>
      </section>
      <section class="blk" aria-labelledby="ab-safe">
        <h2 id="ab-safe">Keeping kids safe</h2>
        <p>This site has no accounts, comments, forms or tracking. It does not ask for or store any name, email or other details about you or your child.</p>
        <p>Videos play inside YouTube's player, which has its own rules. Parents and coaches may want to watch with younger players.</p>
      </section>
      <section class="blk" aria-labelledby="ab-suggest">
        <h2 id="ab-suggest">Suggest a drill</h2>
        <p>Found a good public YouTube video for a skill? Tell us.</p>
        ${suggestControl()}
      </section>`
  };
}
