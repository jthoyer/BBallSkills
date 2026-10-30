/**
 * content.js: every word of site content lives here, in one place.
 *
 * Data only, no markup. Views read it through the helpers at the bottom.
 *
 * Single source of truth rules (checked by scripts/check-content.mjs):
 *  - A drill's text lives ONLY in `drills`. `skills`, `positions` and
 *    `zones` hold drill KEYS (strings), never copies of text.
 *  - `drills[k].group` must agree with `skills[].drills`.
 *  - `drills[k].setup` is a non-empty list of SETUPS keys that agrees with `needs`.
 *  - `drills[k].positions` must agree with `positions[].drills` and with the
 *    drill keys used anywhere in `zones['2-3']` (the value 'zone').
 *
 * Videos: every resource below was found by a web search, and the ID was
 * copied from a youtube.com URL that the search returned. `found` records the
 * result title and URL. All 18 were checked on 29 Oct 2026: a Gemini pass over
 * every video, then a person spot-checked #5, #12, #15 and #17. A new video
 * starts at `watched: false`. Flip it to true ONLY after a person has watched
 * the whole video and it shows what the drill page says (see WATCHLIST.md).
 */

/**
 * Suggest-a-drill form. Leave '' until the Google Form exists: the button then
 * explains how to suggest a drill instead of linking anywhere. Set to an
 * https:// URL and the same button becomes an external link. No other change.
 */
export const config = {
  suggestFormUrl: ''
};

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * What a drill needs, as filter values, in display order. `drills[k].setup`
 * holds these keys. "Just me" means alone and with no hoop. A drill with an
 * optional partner lists both `solo` and `partner`.
 */
export const SETUPS = [
  { key: 'solo', label: 'Just me' },
  { key: 'partner', label: 'Partner or group' },
  { key: 'hoop', label: 'A hoop' }
];

const JR_NBA = {
  name: 'Jr. NBA',
  url: 'https://www.youtube.com/channel/UCuA7P9O4_YEJHa6epPnWAbg'
};

/** Video resources, keyed. `length` is null when the search did not show it. */
export const resources = {
  'hundred-dribble': {
    kind: 'video',
    youtubeId: 'v_jqSQswdbU',
    title: 'Jr. NBA at Home: 100 Dribble Drill',
    channel: JR_NBA,
    length: '1:23',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Jr. NBA at Home: 100 Dribble Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=v_jqSQswdbU'
    }
  },
  'under-leg-dribble': {
    kind: 'video',
    youtubeId: 'KIBJzEn_QG8',
    title: 'Stationary Under The Leg Dribble Drill',
    channel: JR_NBA,
    length: '1:32',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Stationary Under The Leg Dribble Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=KIBJzEn_QG8'
    }
  },
  'scissors-dribble': {
    kind: 'video',
    youtubeId: 'D2hhRG2Hda4',
    title: 'Scissors Dribble Drill',
    channel: JR_NBA,
    length: '1:37',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Scissors Dribble Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=D2hhRG2Hda4'
    }
  },
  'perfect-shot-no-basket': {
    kind: 'video',
    youtubeId: '2vYUUPPasyQ',
    title: 'Jr. NBA at Home: Perfect Shot No Basket Drill',
    channel: JR_NBA,
    length: '1:11',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Jr. NBA at Home: Perfect Shot No Basket Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=2vYUUPPasyQ'
    }
  },
  'form-shooting': {
    kind: 'video',
    youtubeId: 'ZB2ARp7iKO0',
    title: 'Form Shooting Drill with Chiene Jones',
    channel: JR_NBA,
    length: '0:53',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Form Shooting Drill with Chiene Jones - YouTube',
      url: 'https://www.youtube.com/watch?v=ZB2ARp7iKO0'
    }
  },
  'jump-stop-shooting': {
    kind: 'video',
    youtubeId: 'AueLd1-H1V8',
    title: 'Jump Stop Shooting Drill',
    channel: JR_NBA,
    length: '2:15',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Jump Stop Shooting Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=AueLd1-H1V8&pp=0gcJCdgAo7VqN5tD'
    }
  },
  'pass-the-rock': {
    kind: 'video',
    youtubeId: 'k9DtRH442uA',
    title: 'Pass the Rock',
    channel: JR_NBA,
    length: '1:06',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Pass the Rock',
      url: 'https://www.youtube.com/watch?v=k9DtRH442uA'
    }
  },
  'pass-and-follow': {
    kind: 'video',
    youtubeId: 'UxN-i7WnOGs',
    title: 'Pass & Follow Drill',
    channel: JR_NBA,
    length: '2:08',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Pass & Follow Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=UxN-i7WnOGs'
    }
  },
  'two-ball-passing': {
    kind: 'video',
    youtubeId: 'xuOlcPH5mOE',
    title: '2-Ball Passing Drill with Jonathan Chang',
    channel: JR_NBA,
    length: '0:42',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: '2-Ball Passing Drill with Jonathan Chang - YouTube',
      url: 'https://www.youtube.com/watch?v=xuOlcPH5mOE'
    }
  },
  'forward-pivot': {
    kind: 'video',
    youtubeId: '3GPNfqIzs9Y',
    title: 'Forward Pivot Drill',
    channel: JR_NBA,
    length: '1:31',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Forward Pivot Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=3GPNfqIzs9Y'
    }
  },
  'reverse-pivot': {
    kind: 'video',
    youtubeId: '5DgXrx7ZkHU',
    title: 'Reverse Pivot Drill',
    channel: JR_NBA,
    length: '1:43',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Reverse Pivot Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=5DgXrx7ZkHU'
    }
  },
  'pivot-jab-pump-fake': {
    kind: 'video',
    youtubeId: 'xXtmu-ycZ04',
    title: 'Footwork Drill with Ian Thomas-Minor',
    channel: JR_NBA,
    length: '0:54',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Footwork Drill with Ian Thomas-Minor - YouTube',
      url: 'https://www.youtube.com/watch?v=xXtmu-ycZ04'
    }
  },
  'follow-the-leader-slides': {
    kind: 'video',
    youtubeId: 'P-fqrEYD6sQ',
    title: 'Follow The Leader Slides Drill',
    channel: JR_NBA,
    length: '2:18',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Follow The Leader Slides Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=P-fqrEYD6sQ'
    }
  },
  'lateral-push': {
    kind: 'video',
    youtubeId: 'j7JUvMrXLRk',
    title: 'Side/Lateral Push Drill',
    channel: JR_NBA,
    length: '1:59',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Side/Lateral Push Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=j7JUvMrXLRk&pp=0gcJCdgAo7VqN5tD'
    }
  },
  'closing-time': {
    kind: 'video',
    youtubeId: 'POwKicvOggw',
    title: 'Closing Time',
    channel: JR_NBA,
    length: '1:15',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Closing Time',
      url: 'https://www.youtube.com/watch?v=POwKicvOggw'
    }
  },
  'no-ball-box-out': {
    kind: 'video',
    youtubeId: 'J6QmHTVdKKc',
    title: 'No Ball Box Out Drill',
    channel: JR_NBA,
    length: '6:04',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'No Ball Box Out Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=J6QmHTVdKKc'
    }
  },
  'box-out-at-home': {
    kind: 'video',
    youtubeId: '1wYXo8l2k58',
    title: 'Box Out Drill with Baye Keita',
    channel: JR_NBA,
    length: '0:51',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: 'Box Out Drill with Baye Keita - YouTube',
      url: 'https://www.youtube.com/watch?v=1wYXo8l2k58'
    }
  },
  'three-second-box-out': {
    kind: 'video',
    youtubeId: 'bhTAm_1UflA',
    title: '3-Second Box Out Drill',
    channel: JR_NBA,
    length: '4:20',
    watched: true,
    status: 'ok',
    found: {
      searchTitle: '3-Second Box Out Drill - YouTube',
      url: 'https://www.youtube.com/watch?v=bhTAm_1UflA'
    }
  }
};

/**
 * Drills, keyed by slug. Level grades are ours ("Graded by us"), not the video
 * creator's. Copy describes what the search result title and snippet show, and
 * the "Do it" lines are our own practice suggestions, not claims about the video.
 */
export const drills = {
  /* ---------------- Ball handling ---------------- */
  'hundred-dribble': {
    title: '100 Dribble Drill',
    resource: 'hundred-dribble',
    why: 'When your dribble is steady you can keep your eyes up and see the open teammate instead of watching the ball.',
    teaches: 'Controlled dribbling at different heights: ankle, knee and shoulder.',
    cues: ['Eyes up', 'Fingertips, not palm', 'Keep the ball low'],
    doIt: 'Do 100 dribbles, mixing ankle, knee and shoulder height. Then do 100 with your other hand.',
    level: 'Beginner',
    group: 'ball-handling',
    positions: ['point-guard', 'shooting-guard'],
    needs: ['Ball', 'Flat floor'],
    setup: ['solo']
  },
  'under-leg-dribble': {
    title: 'Stationary Under-the-Leg Dribble',
    resource: 'under-leg-dribble',
    why: 'A dribble through your legs keeps the ball away from a defender when you change direction.',
    teaches: 'The first step of the between-the-legs dribble, done standing still.',
    cues: ['Step, then pass the ball through', 'Keep the ball low', 'Eyes up'],
    doIt: 'Stand still and do 10 slow ones each way, then 10 faster.',
    level: 'Beginner',
    group: 'ball-handling',
    positions: ['point-guard', 'shooting-guard', 'small-forward'],
    needs: ['Ball', 'Flat floor'],
    setup: ['solo']
  },
  'scissors-dribble': {
    title: 'Scissors Dribble',
    resource: 'scissors-dribble',
    why: 'Moving the ball quickly from hand to hand makes it harder for a defender to reach in and steal it.',
    teaches: 'Between-the-legs dribbling while you move.',
    cues: ['Step wide', 'Ball low and quick', 'Eyes up'],
    doIt: 'Do 4 trips across the court, using between-the-legs dribbles all the way.',
    level: 'Intermediate',
    group: 'ball-handling',
    positions: ['point-guard', 'shooting-guard'],
    needs: ['Ball', 'Space to move'],
    setup: ['solo']
  },

  /* ---------------- Shooting ---------------- */
  'perfect-shot-no-basket': {
    title: 'Perfect Shot, No Basket',
    resource: 'perfect-shot-no-basket',
    why: 'A shot you repeat the same way every time goes in more often. You can build it without a hoop.',
    teaches: 'Shooting form, practised without a basket.',
    cues: ['Balance first', 'Elbow under the ball', 'Hold your finish'],
    doIt: 'Do 20 shots with no hoop. Freeze your follow-through on each one.',
    level: 'Beginner',
    group: 'shooting',
    positions: ['shooting-guard', 'small-forward'],
    needs: ['Ball', 'Small space'],
    setup: ['solo']
  },
  'form-shooting': {
    title: 'Form Shooting',
    resource: 'form-shooting',
    why: 'Shooting straight up while lying down shows whether the ball leaves your hand cleanly. Good form is what you rely on when you shoot from farther out.',
    teaches: 'Shooting form, practised lying on your back.',
    cues: ['Elbow under the ball', 'Flick your wrist', 'Ball comes straight back down'],
    doIt: 'Lie on your back and shoot the ball straight up 20 times. It should land back in your hands.',
    level: 'Beginner',
    group: 'shooting',
    positions: ['shooting-guard', 'small-forward'],
    needs: ['Ball', 'Floor to lie on'],
    setup: ['solo']
  },
  'jump-stop-shooting': {
    title: 'Jump Stop Shooting',
    resource: 'jump-stop-shooting',
    why: 'Landing balanced on two feet with a jump stop sets you up to shoot straight and under control.',
    teaches: 'Using a jump stop to get into a balanced shot.',
    cues: ['Land on two feet together', 'Stay low and balanced', 'Shoot up'],
    doIt: 'Dribble in, jump stop, shoot. Do 10 from each side.',
    level: 'Intermediate',
    group: 'shooting',
    positions: ['shooting-guard', 'small-forward'],
    needs: ['Ball', 'Hoop'],
    setup: ['hoop']
  },

  /* ---------------- Passing ---------------- */
  'pass-the-rock': {
    title: 'Pass the Rock',
    resource: 'pass-the-rock',
    why: 'Quick, accurate passes move the defence and find the open player. The ball moves faster than anyone can run.',
    teaches: 'Catching and passing quickly and accurately.',
    cues: ['Step to your target', 'Hands up and ready', 'Catch with two hands'],
    doIt: 'In a small group inside the key, make as many passes as you can in 30 seconds. Try to beat your score.',
    level: 'Beginner',
    group: 'passing',
    positions: ['point-guard'],
    needs: ['Ball', 'Group'],
    setup: ['partner']
  },
  'pass-and-follow': {
    title: 'Pass and Follow',
    resource: 'pass-and-follow',
    why: 'Moving after you pass keeps the offence flowing and gets you ready for the next pass.',
    teaches: 'Passing, then following your pass.',
    cues: ['Pass with a step', 'Hands up as a target', 'Move after you pass'],
    doIt: 'In groups of four to six, keep the ball moving for 2 minutes without dropping it.',
    level: 'Beginner',
    group: 'passing',
    positions: ['point-guard'],
    needs: ['Ball', 'Group'],
    setup: ['partner']
  },
  'two-ball-passing': {
    title: 'Two-Ball Passing',
    resource: 'two-ball-passing',
    why: 'Handling two passes at once builds quick hands and focus, which helps when a pass comes at you fast.',
    teaches: 'Passing with two balls.',
    cues: ['Eyes on your partner', 'Soft hands', 'Keep a steady rhythm'],
    doIt: 'Start with one ball. When it feels easy, add the second. Do 3 rounds of 30 seconds.',
    level: 'Intermediate',
    group: 'passing',
    positions: ['point-guard', 'shooting-guard'],
    needs: ['Two balls', 'Partner'],
    setup: ['partner']
  },

  /* ---------------- Footwork ---------------- */
  'forward-pivot': {
    title: 'Forward Pivot',
    resource: 'forward-pivot',
    why: 'A good pivot lets you protect the ball and look for a pass without travelling.',
    teaches: 'Pivoting forward on one foot while the pivot foot stays planted.',
    cues: ['Keep your pivot foot planted', 'Stay low', 'Protect the ball'],
    doIt: 'Do 10 forward pivots on each foot with the ball held tight.',
    level: 'Beginner',
    group: 'footwork',
    positions: ['power-forward', 'centre'],
    needs: ['Ball', 'Flat floor'],
    setup: ['solo']
  },
  'reverse-pivot': {
    title: 'Reverse Pivot',
    resource: 'reverse-pivot',
    why: 'Pivoting back, away from a defender, keeps your body between them and the ball.',
    teaches: 'The reverse pivot, with the pivot foot staying planted.',
    cues: ['Plant your pivot foot', 'Stay low', 'Keep the ball away from the defender'],
    doIt: 'Do 10 reverse pivots on each foot, then try again with a partner standing in front of you.',
    level: 'Beginner',
    group: 'footwork',
    positions: ['power-forward', 'centre'],
    needs: ['Ball', 'Flat floor'],
    setup: ['solo']
  },
  'pivot-jab-pump-fake': {
    title: 'Jab Step and Pump Fake',
    resource: 'pivot-jab-pump-fake',
    why: 'A jab step and a pump fake can move a defender off balance, which gives you a cleaner shot or pass.',
    teaches: 'Using a jab step and a pump fake to move a defender.',
    cues: ['Pivot foot stays planted', 'Short, sharp jab', 'Sell the fake'],
    doIt: 'Do 8 reps on each side. Then add a partner as a defender.',
    level: 'Intermediate',
    group: 'footwork',
    positions: ['small-forward', 'power-forward'],
    needs: ['Ball', 'Partner (optional)'],
    setup: ['solo', 'partner']
  },

  /* ---------------- Defence ---------------- */
  'follow-the-leader-slides': {
    title: 'Follow the Leader Slides',
    resource: 'follow-the-leader-slides',
    why: 'Quick defensive slides keep you in front of the player with the ball, so they cannot drive straight to the hoop.',
    teaches: 'Defensive slides, reacting to a leader.',
    cues: ['Stay low', 'Slide, do not cross your feet', 'Hands active'],
    doIt: 'In pairs, one leads and one slides with them for 30 seconds. Swap. Do 3 rounds each.',
    level: 'Beginner',
    group: 'defence',
    positions: ['shooting-guard', 'zone'],
    needs: ['Partner', 'Open space'],
    setup: ['partner']
  },
  'lateral-push': {
    title: 'Side/Lateral Push Drill',
    resource: 'lateral-push',
    why: 'A strong push off your back foot helps you get to your spot first and cover more ground when you slide.',
    teaches: 'Covering more ground on defensive slides.',
    cues: ['Push off the back foot', 'Stay low', 'Do not cross your feet'],
    doIt: 'Slide across the key and back 5 times without standing up.',
    level: 'Beginner',
    group: 'defence',
    positions: ['small-forward', 'zone'],
    needs: ['Open space'],
    setup: ['solo']
  },
  'closing-time': {
    title: 'Closing Time',
    resource: 'closing-time',
    why: 'A good closeout takes away the open shot without letting the ball handler blow past you.',
    teaches: 'Closing out under control: chop your feet and get a hand up, without fouling.',
    cues: ['Sprint, then chop your feet', 'Hand up', 'No fouling'],
    doIt: 'With a partner, do 10 closeouts each. Swap after 10.',
    level: 'Intermediate',
    group: 'defence',
    positions: ['shooting-guard', 'small-forward', 'zone'],
    needs: ['Ball', 'Partner'],
    setup: ['partner']
  },

  /* ---------------- Rebounding ---------------- */
  'no-ball-box-out': {
    title: 'No-Ball Box Out',
    resource: 'no-ball-box-out',
    why: 'Boxing out gives your team the first chance at the rebound. You can practise it with no ball at all.',
    teaches: 'Box-out fundamentals, without a ball.',
    cues: ['Find your player', 'Make contact, wide base', 'Hold, then go get the ball'],
    doIt: 'In pairs, do 10 box outs each: find, make contact, hold.',
    level: 'Beginner',
    group: 'rebounding',
    positions: ['power-forward', 'centre', 'zone'],
    needs: ['Partner', 'Open space'],
    setup: ['partner']
  },
  'box-out-at-home': {
    title: 'Box Out Drill',
    resource: 'box-out-at-home',
    why: 'Every rebound you win ends their turn and gives your team the ball. Boxing out is how you earn them.',
    teaches: 'The low, wide box-out stance, practised against a wall.',
    cues: ['Sit low', 'Wide base', 'Back flat to the wall'],
    doIt: 'Hold a box-out stance with your back to a wall for 20 seconds. Rest, then do it 3 times.',
    level: 'Beginner',
    group: 'rebounding',
    positions: ['power-forward', 'centre'],
    needs: ['A wall'],
    setup: ['solo']
  },
  'three-second-box-out': {
    title: '3-Second Box Out',
    resource: 'three-second-box-out',
    why: 'Holding your box out until the ball comes down stops the other team from grabbing the rebound.',
    teaches: 'Holding a box out for a full count.',
    cues: ['Seal and hold', 'Feel them, do not look', 'Then go get the ball'],
    doIt: 'In pairs, hold the box out for a count of three. Do 8, then swap.',
    level: 'Intermediate',
    group: 'rebounding',
    positions: ['power-forward', 'centre', 'zone'],
    needs: ['Ball', 'Partner'],
    setup: ['partner']
  }
};

/** Skill groups, in display order. `drills` lists keys only. */
export const skills = [
  { slug: 'ball-handling', name: 'Ball handling', drills: ['hundred-dribble', 'under-leg-dribble', 'scissors-dribble'] },
  { slug: 'shooting', name: 'Shooting', drills: ['perfect-shot-no-basket', 'form-shooting', 'jump-stop-shooting'] },
  { slug: 'passing', name: 'Passing', drills: ['pass-the-rock', 'pass-and-follow', 'two-ball-passing'] },
  { slug: 'footwork', name: 'Footwork', drills: ['forward-pivot', 'reverse-pivot', 'pivot-jab-pump-fake'] },
  { slug: 'defence', name: 'Defence', drills: ['follow-the-leader-slides', 'lateral-push', 'closing-time'] },
  { slug: 'rebounding', name: 'Rebounding', drills: ['no-ball-box-out', 'box-out-at-home', 'three-second-box-out'] }
];

/** Positions. The slug `zone` is reserved for the zone-defence page. */
export const positions = [
  {
    slug: 'point-guard', number: 1, name: 'Point guard', family: 'Guards',
    drills: ['hundred-dribble', 'under-leg-dribble', 'scissors-dribble', 'pass-the-rock', 'pass-and-follow', 'two-ball-passing']
  },
  {
    slug: 'shooting-guard', number: 2, name: 'Shooting guard', family: 'Guards',
    drills: ['hundred-dribble', 'under-leg-dribble', 'scissors-dribble', 'perfect-shot-no-basket', 'form-shooting', 'jump-stop-shooting', 'two-ball-passing', 'follow-the-leader-slides', 'closing-time']
  },
  {
    slug: 'small-forward', number: 3, name: 'Small forward', family: 'Wings',
    drills: ['under-leg-dribble', 'perfect-shot-no-basket', 'form-shooting', 'jump-stop-shooting', 'pivot-jab-pump-fake', 'lateral-push', 'closing-time']
  },
  {
    slug: 'power-forward', number: 4, name: 'Power forward', family: 'Bigs',
    drills: ['forward-pivot', 'reverse-pivot', 'pivot-jab-pump-fake', 'no-ball-box-out', 'box-out-at-home', 'three-second-box-out']
  },
  {
    slug: 'centre', number: 5, name: 'Centre', family: 'Bigs',
    drills: ['forward-pivot', 'reverse-pivot', 'no-ball-box-out', 'box-out-at-home', 'three-second-box-out']
  }
];

/**
 * Zone defences. Only the 2-3 exists. The text here is ours (general coaching),
 * not a claim about any video. `drills` entries are keys only.
 */
export const zones = {
  '2-3': {
    title: 'Zone defence: the 2-3',
    intro:
      'In a 2-3 zone, five defenders guard areas of the court instead of one player each. ' +
      'Two defenders stand at the top, two on the wings near the baseline, and one in the middle by the basket. ' +
      'Everyone moves as the ball moves.',
    spots: [
      {
        name: 'Top guards',
        count: 2,
        guards: 'The ball at the top and the passes out to the wings. They stop easy drives and shots from the top.',
        drills: ['lateral-push', 'closing-time']
      },
      {
        name: 'Wings',
        count: 2,
        guards: 'The sides and the corners. They cover shots from the wing and corner, and help stop drives down the baseline.',
        drills: ['follow-the-leader-slides', 'closing-time']
      },
      {
        name: 'Middle',
        count: 1,
        guards: 'The paint and the basket. The middle defender guards the player who catches the ball in the middle and is usually the one nearest the rebound.',
        drills: ['three-second-box-out']
      }
    ],
    coreSkills: [
      {
        name: 'Stance and slides',
        text: 'Stay low and slide your feet to stay between the ball and the basket. A zone only works if you can move to your spot quickly.',
        drills: ['follow-the-leader-slides', 'lateral-push']
      },
      {
        name: 'Closeouts',
        text: 'When the ball is passed to a player in your area, sprint to them, then take short steps and get a hand up.',
        drills: ['closing-time']
      },
      {
        name: 'Talking',
        text: 'Call out "ball", "screen" and "help" so your teammates know where the ball is. Add calls yourself when you run the slides drill.',
        drills: ['follow-the-leader-slides']
      },
      {
        name: 'Rotating',
        text: 'When one defender moves out to the ball, a teammate slides across to cover the space they left. Slides and closeouts are the movements you rotate with.',
        drills: ['lateral-push', 'closing-time']
      }
    ],
    rebounding: {
      text: 'In a zone nobody has one player to box out, so each defender finds the nearest attacker and puts a body on them when the shot goes up.',
      drills: ['no-ball-box-out', 'three-second-box-out']
    }
  }
};

/* ---------------- Lookup helpers ---------------- */

export const getDrill = (slug) => (Object.hasOwn(drills, slug) ? drills[slug] : null);
export const getResource = (key) => (Object.hasOwn(resources, key) ? resources[key] : null);
export const getSkill = (slug) => skills.find((s) => s.slug === slug) || null;
export const getPosition = (slug) => positions.find((p) => p.slug === slug) || null;
