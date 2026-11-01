import { siteHelpPage, siteHelpAfterRoute } from './site-help.js?v=2026-11-01-tour-navigation';
import { guidePage } from './guide-page.js?v=2026-11-01-guide-completed';
import {setSnowStatsClient} from './snow-build-stats.js?v=2026-11-01-snow-counts';
import { setSnowOwner } from './seasonal-snow.js?v=2026-11-01-snow-v22';
import {droidTraitsHtml} from './droid-traits.js?v=2026-10-31-iconic-copy';
import { scourgeCount, hiveMindBonus, placedHive } from './scourge.js?v=2026-10-31-r2-crates';
import {ensureProfileCatalogue} from './profile-catalogue.js?v=2026-10-18-signin-fix';
import {normaliseMissionSettings,missionEstimate,missionProgress,offlineEstimate} from './mission-economy.js?v=2026-10-31-r2-crates';
import {mountMissionTools} from './mission-tools-ui.js?v=2026-10-31-r2-crates';
import { cb23RewardsHtml } from './update-135.js?v=2026-10-31-trait-guide';
import { TRAITS, traitOptionLabel, normaliseTrait, traitEligible, traitAmount, traitSum, traitLabel, companionPerkActive, overclockFactor, companionGoalValue, normaliseIconicTraits, rememberIconicTraits } from './traits.js?v=2026-10-31-r2-crates';
import { traitsPage } from './traits-page.js?v=2026-10-31-r2-crates';
import { COMING_SOON_DROIDS, isComingSoonDroid, comingSoonCard, comingSoonDetail } from './coming-soon-droids.js?v=2026-10-31-r2-crates';
import { novaVisibleLevels, novaTotalCost, novaLevelRow } from './nova-levels.js?v=2026-10-07-unlimited';
import {normaliseEventProgress} from './event-data.js?v=2026-10-31-r2-crates';
import {eventPage,startEventReminders} from './event-page.js?v=2026-10-31-r2-crates';
import { companionPage } from './companion-page.js?v=2026-10-08-beta37';
import { workingIncome, scrapRewards, scrapProgress, scrapActiveEstimate, SCRAP_QUALITIES, normaliseParty, partyBonuses } from './economy.js?v=2026-10-18-mission-tools';
import { craftingEstimate, companionAttributeValue } from './crafting.js?v=2026-10-31-r2-crates';
import { testMapPage } from './test-map.js?v=2026-10-31-map-commands';
import { startSiteActivity, showSiteStats } from './site-stats.js?v=2026-10-05-layouts';
let siteActivity=null,kyberPreviewVerified=false;
import { kyberIsReleased, isKyberPreviewUser, visiblePatchNotes } from './release-gate.js?v=2026-09-26-stats';
import { validateOptimisePlan } from './optimise-plan-validation.js?v=2026-10-31-r2-crates';
import { planOptimiseRoute, predictWorkLanding, predictStationLanding, predictProtocolCompanionLanding, predictCompanionWorkLanding, shortenOptimiseWalk } from './optimise-route.js?v=2026-10-31-fusion-fixes';
import { slotDistanceSquared, slotPosition } from './slot-geometry.js?v=2026-10-31-map-panels';
import { createOptimiseBackground } from './optimise-background.js?v=2026-10-09-search';
import { createAssignmentScorer } from './optimise-layout-score.js?v=2026-10-31-r2-crates';
import { createArchiveExperience } from './archive-experience.js?v=2026-09-28-gonkoween';
import { kyberGuide, kyberDroidDetails, kyberActivationCost } from './kyber-guide.js?v=2026-09-27-active-rebirth';
let archiveExperience=null;
const DROID_TYPES=['WORKER','ASTROMECH','BATTLE','PROTOCOL'];
const ALL_VARIANTS=['DEFAULT','GOLD','DIAMOND','RAINBOW','BESKAR','GALACTIC','STELLAR','KYBER'];
let VARIANTS=ALL_VARIANTS.slice(0,kyberIsReleased()?8:7);
// Activation colours are forms of Kyber, never additional upgrade tiers.
const OWNED_VARIANTS=[...ALL_VARIANTS,'KYBER_GREEN','KYBER_BLUE','KYBER_PURPLE','SCOURGE'];
const baseVariant=v=>String(v||'').startsWith('KYBER_')?'KYBER':v;
const variantRank=v=>v==='SCOURGE'?8:ALL_VARIANTS.indexOf(baseVariant(v));
const isActiveKyber=v=>['KYBER_GREEN','KYBER_BLUE','KYBER_PURPLE'].includes(v);
const rebirthVariantReady=(have,required,active=false)=>Boolean(have&&variantRank(have)>=variantRank(required)&&(have==='SCOURGE'||baseVariant(required)!=='KYBER'||isActiveKyber(have)||(have==='KYBER'&&active)));
const requirementVariantText=v=>variantText(v)+(baseVariant(v)==='KYBER'?' (active)':'');
const activationNeeded=(have,required)=>have==='KYBER'&&baseVariant(required)==='KYBER';
const activationCostText=d=>kyberActivationCost(d)===null?'Activation cost unavailable':`${fmt(kyberActivationCost(d))} Kyber Crystal${kyberActivationCost(d)===1?'':'s'}`;
const rebirthActionText=(d,have,required,chips=0)=>activationNeeded(have,required)?`Activate · ${activationCostText(d)}`:`Upgrade from ${variantLabel(have)} · ${fmt(chips)} chips${baseVariant(required)==='KYBER'?` · then activate for ${activationCostText(d)}`:''}`;
let DISPLAY_VARIANTS=kyberIsReleased()?OWNED_VARIANTS:VARIANTS;
const GOOGLE_CLIENT_ID='639634997022-sla3g6plurr364s6liq4vouj003rcaus.apps.googleusercontent.com';
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const CLOUD_FILE_NAME='droid-archives-cloud-save.json';
const LOCAL_PROFILES_KEY='droid-archive-local-profiles';
const SUPABASE_CONFIG_PATH='data/supabase-config.json';
const PUBLIC_SITE_URL='https://rssaltea.github.io/DroidArchives/';
// The sites this app is published at. A reset link sends the player back to
// the one they started from (each must be allowed in Supabase's URL settings).
const AUTH_SITES=['https://droidarchives.co.uk/','https://rssaltea.github.io/DroidArchives/','https://rssaltea.github.io/DroidArchives-Fallback/'];
// Reset and confirmation links land with Supabase's tokens, or an error, in the
// URL. They are read once here, before routing, so the router shows the home
// page rather than "not found" and the app can act on them once the Supabase
// client has consumed them.
const isAuthCallbackHash=hash=>/(^|[#&])(access_token|refresh_token|error|error_code|error_description|type)=/.test(hash);
const AUTH_CALLBACK=(()=>{const hash=location.hash.replace(/^#/,''),params=new URLSearchParams(isAuthCallbackHash(hash)?hash:''),query=new URLSearchParams(location.search);const get=key=>params.get(key)||query.get(key)||'';return {recovery:get('type')==='recovery',error:get('error_description'),errorCode:get('error_code'),present:isAuthCallbackHash(hash)||query.has('code')||query.has('error')};})();
const GALACTIC_REPORTS_ENABLED=false;
function droidAttribute(d,variant='DEFAULT'){
  // Iconics have no rarity/quality scaling, so their attribute is whatever
  // passive they carry. Only some have one recorded.
  if(isIconic(d))return d?.special?.passive||'N/A';
  const value=companionAttributeValue(d,variant);
  if(d.type==='WORKER')return`+${Math.round(value*100)}% Droid Crafting Speed (Companion)`;
  if(d.type==='ASTROMECH')return`+${value} Pickaxe Level${value===1?'':'s'} (Companion)`;
  if(d.type==='BATTLE')return`+${value} Max Health (Companion)`;
  if(d.type==='PROTOCOL')return`+${value}% Credit Multiplier (Companion)`;
  return'N/A'
}
const droidGameplayAttribute=(d,variant)=>`${d.name} provides <strong>${droidAttribute(d,variant)}</strong>.`;
const syncProvider=localStorage.getItem('droid-archive-sync-provider')||'local';
let supabaseConfig={url:'',anonKey:'',table:'droid_archive_profiles'};
let supabaseClient=null;
const state={missionSettings:normaliseMissionSettings(JSON.parse(localStorage.getItem('droid-archive-mission-settings')||'{}')),iconicTraits:JSON.parse(localStorage.getItem('droid-archive-iconic-traits')||'{}'),eventProgress:normaliseEventProgress(JSON.parse(localStorage.getItem('droid-archive-event-progress')||'null')),party:normaliseParty(JSON.parse(localStorage.getItem('droid-archive-party')||'null')),droids:[],rebirths:{},images:{},events:[],novaShop:null,cantinaShop:null,owned:JSON.parse(localStorage.getItem('droid-archive-owned')||'[]'),blueprints:JSON.parse(localStorage.getItem('droid-archive-blueprints')||'[]'),droidex:JSON.parse(localStorage.getItem('droid-archive-droidex')||'[]'),novaUpgrades:JSON.parse(localStorage.getItem('droid-archive-nova-upgrades')||'{}'),novaIconicUnlocks:JSON.parse(localStorage.getItem('droid-archive-nova-iconic-unlocks')||'[]'),cantinaPurchases:JSON.parse(localStorage.getItem('droid-archive-cantina-purchases')||'{}'),cantinaPackGrants:JSON.parse(localStorage.getItem('droid-archive-cantina-pack-grants')||'{}'),multiplier:Math.max(1,Number(localStorage.getItem('droid-archive-multiplier')||1)||1),cycle:Number(localStorage.getItem('droid-archive-cycle')||0),rebirth:Number(localStorage.getItem('droid-archive-rebirth')||0),superRebirthGoal:Number(localStorage.getItem('droid-archive-super-rebirth-goal')||30),astromechIconicRoles:JSON.parse(localStorage.getItem('droid-archive-astromech-iconic-roles')||'{}'),fusionKeepRules:JSON.parse(localStorage.getItem('droid-archive-fusion-keep-rules')||'[]'),fusionPreferences:normaliseFusionPreferences(JSON.parse(localStorage.getItem('droid-archive-fusion-preferences')||'null')),notificationPreferences:normaliseNotificationPreferences(JSON.parse(localStorage.getItem('droid-archive-notification-preferences')||'null')),protocolPriority:localStorage.getItem('droid-archive-protocol-priority')==='crafting'?'crafting':'credits',optimiseFreeBuild:localStorage.getItem('droid-archive-optimise-free-build')==='1',optimiseFuseFirst:localStorage.getItem('droid-archive-optimise-fuse-first')!=='0',optimiseIncludeIconics:localStorage.getItem('droid-archive-optimise-include-iconics')==='1',fusionAsLounge:localStorage.getItem('droid-archive-fusion-as-lounge')==='1',showRegionalProduction:localStorage.getItem('droid-archive-show-regional-production')!=='0',optimiseFreeBuildMode:localStorage.getItem('droid-archive-optimise-free-build-mode')||'upgrade-cost',optimiseMinGainPercent:Number(localStorage.getItem('droid-archive-optimise-min-gain')??0.5),optimiseKeepDroidex:localStorage.getItem('droid-archive-optimise-keep-droidex')!=='0',optimiseKeepProtocol:localStorage.getItem('droid-archive-optimise-keep-protocol')!=='0',companionGoals:JSON.parse(localStorage.getItem('droid-archive-companion-goals')||'null'),preferredCompanions:JSON.parse(localStorage.getItem('droid-archive-preferred-companions')||'[]'),autoCompleteBuilds:localStorage.getItem('droid-archive-auto-complete-builds')==='1',autoPurchaseSlots:localStorage.getItem('droid-archive-auto-purchase-slots')!=='0',purchasedSlots:JSON.parse(localStorage.getItem('droid-archive-purchased-slots')||'[]'),rebirthTracker:JSON.parse(localStorage.getItem('droid-archive-rebirth-tracker')||'{"notUsingBase":false,"entries":{}}'),loungePurchased:Number(localStorage.getItem('droid-archive-lounge-purchased')||0),novaLevel:Number(localStorage.getItem('droid-archive-nova-level')||0),theme:localStorage.getItem('droid-archive-theme')||'dark',localDoc:null,groups:{workspace:[],loading:false,loaded:false,error:'',loadPromise:null},sharedView:null,cloud:{provider:'supabase',session:null,user:null,doc:null,activeProfileId:localStorage.getItem('droid-archive-active-profile')||'',enabled:syncProvider==='supabase',reconnecting:syncProvider==='supabase',syncing:false,loadPromise:null,initializingNewAccount:false,loadedProfileCount:0,allowProfileCountDecrease:false,status:syncProvider==='supabase'?'Restoring session…':'Local save',token:null,tokenExpiresAt:0,fileId:localStorage.getItem('droid-archive-cloud-file-id')||'',tokenClient:null}};
if(!localStorage.getItem('droid-archive-super-rebirth-goal'))state.superRebirthGoal=kyberIsReleased()?40:35;
if(!Array.isArray(state.purchasedSlots))state.purchasedSlots=[];
function normalizeRebirthTracker(value){const entries={};for(const [key,row] of Object.entries(value?.entries||{})){if(!row||typeof row!=='object')continue;const variant=OWNED_VARIANTS.includes(row.variant)?row.variant:null;entries[key]={...(variant?{variant}:{}),complete:Boolean(row.complete),kyberActive:Boolean(row.kyberActive)}}return{notUsingBase:Boolean(value?.notUsingBase),currentByCycle:Object.fromEntries(Object.entries(value?.currentByCycle||{}).map(([key,n])=>[key,Math.max(0,Math.floor(Number(n)||0))])),entries}}
state.rebirthTracker=normalizeRebirthTracker(state.rebirthTracker);
const LEGACY_DROID_NAMES={'C3-PO':'C-3PO','BU-4D':'B-U4D'};
const canonicalDroidName=name=>LEGACY_DROID_NAMES[name]||name;
const normalizeDroidRows=rows=>Array.isArray(rows)?rows.map(row=>row?.name?{...row,name:canonicalDroidName(row.name)}:row):rows;
function normalizeLoadedDroidNames(){let changed=false;for(const rows of [state.owned,state.blueprints,state.droidex])for(const row of rows){const next=canonicalDroidName(row?.name);if(row&&next!==row.name){row.name=next;changed=true}if(row?.lockedCompanion&&!row.lockedSlot){row.lockedSlot=true;delete row.lockedCompanion;changed=true}}if(changed)saveLocal()}
const app=document.querySelector('#app');
state.patchNotes=[];
let patchNotesPrompted=false;
// ── Desktop companion bridge ──────────────────────────────────────────────
// The Electron companion embeds this site with ?companion=1 and reads
// window.__companionOptimise instead of scraping the rendered DOM. Publishing
// is a no-op for normal browser visitors.
const companionMode=new URLSearchParams(location.search).get('companion')==='1';
// The companion embeds this page in a short, wide panel. Marking the document
// lets the stylesheet render a version that fits it, rather than squeezing the
// full-width site into a strip until the navigation runs off the edge.
if(companionMode)document.documentElement.classList.add('in-companion');
// Quick search for a shell's search box: the best few name matches with what
// a suggestion row needs. Prefix matches come first, then word starts, then
// anything containing the text.
window.searchDroids=(query,limit=8)=>{const q=String(query||'').trim().toLowerCase();if(!q)return[];const rank=name=>{const n=name.toLowerCase();return n.startsWith(q)?0:n.split(/[^a-z0-9]+/).some(w=>w.startsWith(q))?1:n.includes(q)?2:-1};return state.droids.map(d=>({d,r:rank(d.name)})).filter(x=>x.r>=0).sort((a,b)=>a.r-b.r||a.d.name.localeCompare(b.d.name)).slice(0,limit).map(({d})=>({name:d.name,type:d.type,rarity:d.rarity,href:`#/droid/${slug(d.name)}`,image:imageFor(d,'DEFAULT')||''}))};
function publishCompanionState(optimise){
  if(!companionMode)return;
  const prev=window.__companionOptimise||{},path=location.hash.slice(1).split('?')[0]||'/';
  window.__companionOptimise={
    version:1,updatedAt:Date.now(),path,
    dataLoaded:state.droids.length>0,
    cloudEnabled:Boolean(state.cloud.enabled),
    restoring:Boolean(state.cloud.reconnecting),
    signedIn:Boolean(state.cloud.session),
    cloudStatus:String(state.cloud.status||''),
    ownedCount:state.owned.reduce((sum,x)=>sum+(Number(x.qty)||0),0),
    optimise:optimise||(path==='/optimise'?prev.optimise||null:null)
  };
}
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const fmt=n=>{if(!n)return '—';const u=[['Q',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]];for(const [s,v] of u)if(n>=v)return `${(n/v).toLocaleString(undefined,{maximumFractionDigits:3})}${s}`;return n.toLocaleString()};
// Ordered to match the banners in game: Stellar, Mythic, Galactic. Offsets are
// minutes past the hour and land the same in UK time either way, since BST is a
// whole hour ahead of UTC. Stellar lands on the hour, read off a 15:07 countdown
// at 01:44:53 BST, which agrees with Mythic (10:07 to :55) and Galactic (00:07
// to :45) from the same screenshot.
// The DJ Event runs two fixed windows a week. It is anchored to UTC because it
// starts at the same instant for everyone regardless of their timezone, so the
// countdown is the whole story and no dates or day names need showing.
// The two windows are not one repeating interval, so this cannot use
// intervalMinutes/offsetMinutes like the spawn timers can.
// The game announces these in US Eastern - 10am and 8pm - so these UTC hours
// hold only while Eastern is on daylight time; they shift an hour when it ends.
const DJ_EVENT_WINDOWS=[{day:2,hour:14},{day:3,hour:0}];   // Tue 14:00, Wed 00:00 UTC
const DJ_EVENT_DURATION_MS=3*3600000;
// Mega Crate screenshot: Thu 15:00 and Fri 01:00 in September BST (UTC+1).
const MINI_EVENTS=[
  {id:'dj',name:'DJ Event',windows:DJ_EVENT_WINDOWS,note:'Two weekly windows',image:'assets/events/Dance-Party-Mini-Event.png'},
  {id:'crate',name:'Crate Mini Event',windows:[{day:4,hour:14},{day:5,hour:0}],note:'Two weekly windows',image:'assets/events/MiniEvent_Banner_MegaCrate.png'}
];
// Candidate starts either side of this week, so a countdown near a week
// boundary still finds the window that is about to open.
function windowStarts(windows,now){const midnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()),day=now.getUTCDay(),starts=[];for(const w of windows)for(let week=-1;week<=1;week+=1)starts.push(midnight+(w.day-day+week*7)*86400000+w.hour*3600000);return starts.sort((a,b)=>a-b)}
function windowState(timer,now=new Date()){if(timer.events)return timer.events.map(event=>({...windowState(event,now),event})).sort((a,b)=>Number(b.active)-Number(a.active)||a.ms-b.ms)[0];const t=now.getTime(),duration=timer.durationMs||DJ_EVENT_DURATION_MS,starts=windowStarts(timer.windows,now),open=starts.find(start=>t>=start&&t<start+duration);if(open!==undefined)return{active:true,ms:open+duration-t};return{active:false,ms:starts.find(start=>start>t)-t}}
const SPAWN_TIMERS=[
  {id:'stellar',name:'Stellar Spawn',intervalMinutes:60,offsetMinutes:35,note:'Every 60 minutes',image:'assets/events/stellar-spawn.png'},
  {id:'mythic',name:'Mythic Spawn',intervalMinutes:60,offsetMinutes:55,note:'Every 60 minutes',image:'assets/events/mythic-spawn.png'},
  // Hourly period and 20-minute spacing confirmed in game. Clock alignment
  // provisionally retains the existing Mythic :55 anchor.
  {id:'kyber',name:'Kyber Spawn',intervalMinutes:60,offsetMinutes:15,note:'Every 60 minutes',image:'assets/events/kyber-spawn-transparent.png'},
  // Preserve the retired Galactic schedule without showing it in the timer bar.
  {id:'galactic',enabled:false,name:'Galactic Spawn',intervalMinutes:60,offsetMinutes:45,note:'Every 60 minutes',image:'assets/events/galactic-spawn.png'},
  {id:'dj',name:'Mini Events',events:MINI_EVENTS,note:'Next event',image:'assets/events/Dance-Party-Mini-Event.png'}
];
const activeSpawnTimers=()=>SPAWN_TIMERS.filter(timer=>timer.enabled!==false);
const padTime=n=>String(n).padStart(2,'0');
function durationParts(ms){const total=Math.max(0,Math.ceil(ms/1000)),days=Math.floor(total/86400),hours=Math.floor(total%86400/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return{days,hours,minutes,seconds}}
function shortDuration(ms){const p=durationParts(ms),parts=[];if(p.days)parts.push(`${p.days}d`);if(p.hours||p.days)parts.push(`${p.hours}h`);parts.push(`${p.minutes}m`,`${p.seconds}s`);return parts.join(' ')}
// Days, hours, minutes while the wait is long, and hours, minutes, seconds once
// the event is running. Three hours is short enough for seconds to mean
// something, and the game's own sign counts down in h:m:s - reading the same way
// is what lets the two sit side by side.
// Days, hours, minutes. A window timer can be most of a week away, so folding
// days into the hours field gives "140:27:54" — a number nobody reads as five
// and a bit days. Seconds are dropped: at this range they are noise, and three
// fields keep the card the same width as the spawn timers beside it.
function windowClock(ms){const p=durationParts(ms);return `${padTime(p.days)}:${padTime(p.hours)}:${padTime(p.minutes)}`}
function clockDuration(ms){const p=durationParts(ms),hours=p.hours+p.days*24;return `${padTime(hours)}:${padTime(p.minutes)}:${padTime(p.seconds)}`}
function nextSpawn(timer,now=new Date()){const interval=timer.intervalMinutes*60000,offset=timer.offsetMinutes*60000,elapsed=now.getTime()-offset,next=Math.ceil(elapsed/interval)*interval+offset;return next<=now.getTime()?next+interval:next}
const eventRetentionMs=event=>Math.max(0,Number(event?.endedRetentionHours??2))*3600000;
function eventOccurrence(event,now=new Date()){const baseStart=Date.parse(event.startsAt),duration=(event.durationHours||24)*3600000,baseEnd=Date.parse(event.endsAt)||baseStart+duration,t=now.getTime(),retention=eventRetentionMs(event);let start=baseStart,end=baseEnd;if(Number.isFinite(Number(event.repeatGapDays))&&t>=baseEnd+retention){const period=duration+Number(event.repeatGapDays)*86400000,repeatCount=Number.isFinite(Number(event.repeatCount))?Math.max(0,Number(event.repeatCount)):Infinity;let index=Math.min(Math.floor((t-baseStart)/period),repeatCount);start=baseStart+index*period;end=start+duration;if(t>=end+retention&&index<repeatCount){start+=period;end+=period}}return{...event,start,end}}
function currentEvent(now=new Date()){const events=state.events.filter(event=>event.homepage!==false).map(event=>eventOccurrence(event,now)).sort((a,b)=>a.start-b.start),t=now.getTime(),active=events.find(event=>t>=event.start&&t<event.end),ended=events.filter(event=>t>=event.end&&t<event.end+eventRetentionMs(event)).sort((a,b)=>b.end-a.end)[0],upcoming=events.find(event=>t<event.start);return active||ended||upcoming||null}
function eventStatus(event,now=new Date()){if(!event)return null;const t=now.getTime();if(t<event.start)return{label:'Starts in',value:shortDuration(event.start-t),state:'upcoming'};if(t<event.end)return{label:'Active for',value:shortDuration(event.end-t),state:'active'};if(t<event.end+eventRetentionMs(event))return{label:'Status',value:'Ended',state:'inactive'};return null}
function timerShell(){const home=(location.hash.slice(1).split('?')[0]||'/')==='/',event=home?currentEvent():null,collapsed=localStorage.getItem('droid-archive-timers-collapsed')==='1',timers=activeSpawnTimers();return `<section class="archive-timers ${home?'home-timers':'compact-timers'} ${collapsed?'timers-collapsed':''} ${timerDock.docked?'timers-docked':''}" aria-label="UTC spawn timers"><button class="timer-toggle" type="button" aria-expanded="${collapsed?'false':'true'}">${collapsed?'Show timers':'Hide timers'}</button><div class="spawn-timers" style="--spawn-timer-count:${timers.length}">${timers.map(timer=>`<article class="spawn-timer spawn-${timer.id}" data-spawn-timer="${timer.id}"><img src="${timer.image}" alt=""><div><span>${timer.name}</span><strong>${timer.comingSoon?'Coming Soon':'--:--'}</strong><small>${timer.note}</small></div></article>`).join('')}</div></section>${event?`<article class="event-card" data-event-card="${event.id}"><div class="event-art">${event.image?`<img src="${event.image}" alt="${event.name}">`:''}</div><div><p class="eyebrow">${event.category||'Event'}</p><h2>${event.name}</h2><p>${event.description||''}</p><div class="event-status" data-event-status><span>Starts in</span><strong>--</strong></div></div></article>`:''}`}
function updateArchiveTimers(){document.querySelectorAll('.archive-timers').forEach(root=>{const now=new Date();SPAWN_TIMERS.forEach(timer=>{const node=root.querySelector(`[data-spawn-timer="${timer.id}"]`),card=node?.querySelector('strong');if(!card)return;if(timer.comingSoon){card.textContent='Coming Soon';return}if(timer.windows||timer.events){const s=windowState(timer,now),event=s.event||timer;card.textContent=s.active?clockDuration(s.ms):windowClock(s.ms);node.dataset.timerActive=s.active?'1':'0';node.dataset.miniEvent=event.id;node.querySelector('span').textContent=event.name;const img=node.querySelector('img');if(img.getAttribute('src')!==event.image)img.src=event.image;const note=node.querySelector('small');if(note)note.textContent=s.active?'Active now':event.note;return}card.textContent=clockDuration(nextSpawn(timer,now)-now.getTime())})});document.querySelectorAll('[data-event-card]').forEach(eventNode=>{const now=new Date(),event=currentEvent(now),status=eventStatus(event,now);if(!event||!status){eventNode.remove();return}eventNode.dataset.eventState=status.state;eventNode.querySelector('[data-event-status] span').textContent=status.label;eventNode.querySelector('[data-event-status] strong').textContent=status.value})}
// Any page render replaces app.innerHTML, which destroys the timer panel, and a
// MutationObserver rebuilds it. Holding the docked state on the element meant
// every click brought it back at full width until the next scroll, so it lives
// out here and timerShell paints it docked from the start.
let timerDock={docked:false,at:null};
function updateTimerDocking(){if(document.documentElement.hasAttribute('data-ui-fixed'))return;const root=app.querySelector('.archive-timers');if(!root)return;const desktop=innerWidth>=1700;if(!desktop){timerDock={docked:false,at:null};root.classList.remove('timers-docked');root.style.left='';return}const wasDocked=timerDock.docked;root.classList.toggle('timers-docked',wasDocked);if(timerDock.at===null||!wasDocked)timerDock.at=Math.round(root.getBoundingClientRect().top+scrollY+root.offsetHeight+16);root.dataset.dockAt=timerDock.at;
  // Docking makes the timers position:fixed, which takes them out of the flow and
  // shortens the page by their own height. That can pull scrollY back under the
  // threshold, undock, restore the height, and dock again — a loop that pins the
  // main thread with nothing logged. Releasing only once you are a full panel
  // height back above the mark makes the two states impossible to flip between.
  const mark=timerDock.at,release=mark-root.offsetHeight-24;
  const docked=wasDocked?scrollY>release:scrollY>mark;
  if(docked!==wasDocked){timerDock.docked=docked;root.classList.toggle('timers-docked',docked)}if(!docked){root.style.left='';return}const content=[...app.children].filter(x=>!x.classList.contains('archive-timers')&&!x.classList.contains('event-card')),contentRight=Math.max(0,...content.map(x=>x.getBoundingClientRect().right).filter(Boolean)),viewportRight=document.documentElement.clientWidth,timerWidth=root.offsetWidth,gutter=Math.max(0,viewportRight-contentRight),left=contentRight+Math.max(12,(gutter-timerWidth)/2);root.style.left=`${Math.min(left,viewportRight-timerWidth-12)}px`}
function mountArchiveTimers(){const path=location.hash.slice(1).split('?')[0]||'/';if(path==='/todo'||path==='/donate'||path==='/groups'||path==='/companion'){app.querySelector('.archive-timers')?.remove();return}if(!state.droids.length||app.querySelector('.archive-timers'))return;app.insertAdjacentHTML('afterbegin',timerShell());const toggle=app.querySelector('.timer-toggle');if(toggle)toggle.onclick=()=>{const root=app.querySelector('.archive-timers'),collapsed=!root.classList.contains('timers-collapsed');root.classList.toggle('timers-collapsed',collapsed);localStorage.setItem('droid-archive-timers-collapsed',collapsed?'1':'0');toggle.textContent=collapsed?'Show timers':'Hide timers';toggle.setAttribute('aria-expanded',collapsed?'false':'true');updateTimerDocking()};updateArchiveTimers();updateTimerDocking();settleModernTimerScroll()}
setInterval(updateArchiveTimers,1000);
addEventListener('scroll',updateTimerDocking,{passive:true});
addEventListener('resize',updateTimerDocking);
function profileDataFromState(){return{eventProgress:normaliseEventProgress(state.eventProgress),party:normaliseParty(state.party),owned:state.owned,blueprints:state.blueprints,droidex:state.droidex,novaUpgrades:state.novaUpgrades,novaIconicUnlocks:normaliseNovaIconicUnlocks(state.novaIconicUnlocks),missionSettings:normaliseMissionSettings(state.missionSettings),iconicTraits:state.iconicTraits,cantinaPurchases:state.cantinaPurchases,cantinaPackGrants:state.cantinaPackGrants,multiplier:state.multiplier,cycle:state.cycle,rebirth:state.rebirth,superRebirthGoal:state.superRebirthGoal,astromechIconicRoles:normaliseAstromechIconicRoles(state.astromechIconicRoles),fusionKeepRules:state.fusionKeepRules||[],fusionPreferences:normaliseFusionPreferences(state.fusionPreferences),notificationPreferences:normaliseNotificationPreferences(state.notificationPreferences),protocolPriority:state.protocolPriority,optimiseFreeBuild:state.optimiseFreeBuild,optimiseFuseFirst:state.optimiseFuseFirst,optimiseIncludeIconics:Boolean(state.optimiseIncludeIconics),fusionAsLounge:state.fusionAsLounge,showRegionalProduction:state.showRegionalProduction,optimiseFreeBuildMode:state.optimiseFreeBuildMode,optimiseMinGainPercent:state.optimiseMinGainPercent,optimiseKeepDroidex:state.optimiseKeepDroidex,optimiseKeepProtocol:state.optimiseKeepProtocol,companionGoals:state.companionGoals,preferredCompanions:state.preferredCompanions,autoCompleteBuilds:state.autoCompleteBuilds,autoPurchaseSlots:state.autoPurchaseSlots,purchasedSlots:state.purchasedSlots,loungePurchased:state.loungePurchased,novaLevel:state.novaLevel,rebirthTracker:state.rebirthTracker}}
function cloneProfileData(data){return JSON.parse(JSON.stringify(data))}
function cloneProfileBaseOnly(data){const copy=cloneProfileData(data);copy.droidex=[];return copy}
function blankProfileData(){return{eventProgress:normaliseEventProgress(),party:normaliseParty(),owned:[],blueprints:[],droidex:[],novaUpgrades:{},novaIconicUnlocks:[],missionSettings:normaliseMissionSettings(),iconicTraits:{},cantinaPurchases:{},cantinaPackGrants:{},multiplier:1,cycle:0,rebirth:0,superRebirthGoal:maxRebirth(),astromechIconicRoles:{},fusionKeepRules:[],fusionPreferences:normaliseFusionPreferences(),notificationPreferences:normaliseNotificationPreferences(),protocolPriority:'credits',optimiseFreeBuild:false,optimiseFuseFirst:true,optimiseIncludeIconics:false,fusionAsLounge:false,showRegionalProduction:true,optimiseFreeBuildMode:'upgrade-cost',optimiseMinGainPercent:0.5,optimiseKeepDroidex:true,optimiseKeepProtocol:true,autoCompleteBuilds:false,companionGoals:null,preferredCompanions:[],autoPurchaseSlots:true,purchasedSlots:[],loungePurchased:0,novaLevel:0,rebirthTracker:{notUsingBase:false,entries:{}}}}
function applyProfileData(data){const next=validateBaseImport({base:{eventProgress:data?.eventProgress,party:data?.party,owned:normalizeDroidRows(data?.owned||[]),blueprints:normalizeDroidRows(data?.blueprints||[]),droidex:normalizeDroidRows(data?.droidex||[]),novaUpgrades:data?.novaUpgrades||{},novaIconicUnlocks:data?.novaIconicUnlocks,missionSettings:data?.missionSettings,iconicTraits:data?.iconicTraits,cantinaPurchases:data?.cantinaPurchases||{},cantinaPackGrants:data?.cantinaPackGrants||{},multiplier:data?.multiplier,cycle:data?.cycle,rebirth:data?.rebirth,superRebirthGoal:data?.superRebirthGoal,astromechIconicRoles:data?.astromechIconicRoles,fusionKeepRules:data?.fusionKeepRules,fusionPreferences:data?.fusionPreferences,notificationPreferences:data?.notificationPreferences,protocolPriority:data?.protocolPriority,optimiseFreeBuild:data?.optimiseFreeBuild,optimiseFuseFirst:data?.optimiseFuseFirst,optimiseIncludeIconics:data?.optimiseIncludeIconics,fusionAsLounge:data?.fusionAsLounge,showRegionalProduction:data?.showRegionalProduction,optimiseFreeBuildMode:data?.optimiseFreeBuildMode,optimiseMinGainPercent:data?.optimiseMinGainPercent,optimiseKeepDroidex:data?.optimiseKeepDroidex,optimiseKeepProtocol:data?.optimiseKeepProtocol,companionGoals:data?.companionGoals,preferredCompanions:data?.preferredCompanions,autoCompleteBuilds:data?.autoCompleteBuilds,autoPurchaseSlots:data?.autoPurchaseSlots,purchasedSlots:data?.purchasedSlots,loungePurchased:data?.loungePurchased,novaLevel:data?.novaLevel,rebirthTracker:data?.rebirthTracker}});state.eventProgress=normaliseEventProgress(next.eventProgress);state.party=normaliseParty(next.party);state.owned=next.owned;state.blueprints=next.blueprints;state.droidex=next.droidex;state.novaUpgrades=next.novaUpgrades;state.novaIconicUnlocks=next.novaIconicUnlocks;state.missionSettings=normaliseMissionSettings(next.missionSettings);state.iconicTraits=next.iconicTraits;state.cantinaPurchases=next.cantinaPurchases;state.cantinaPackGrants=next.cantinaPackGrants;state.multiplier=next.multiplier;state.cycle=next.cycle;state.rebirth=next.rebirth;state.superRebirthGoal=next.superRebirthGoal;state.astromechIconicRoles=next.astromechIconicRoles;state.fusionKeepRules=next.fusionKeepRules||[];state.fusionPreferences=normaliseFusionPreferences(next.fusionPreferences);state.notificationPreferences=normaliseNotificationPreferences(next.notificationPreferences);state.protocolPriority=next.protocolPriority;state.optimiseFreeBuild=next.optimiseFreeBuild;state.optimiseFuseFirst=next.optimiseFuseFirst;state.optimiseIncludeIconics=next.optimiseIncludeIconics;state.fusionAsLounge=next.fusionAsLounge;state.showRegionalProduction=next.showRegionalProduction;state.optimiseFreeBuildMode=next.optimiseFreeBuildMode;state.optimiseMinGainPercent=Number.isFinite(Number(next.optimiseMinGainPercent))?Number(next.optimiseMinGainPercent):0.5;state.optimiseKeepDroidex=next.optimiseKeepDroidex!==false;state.optimiseKeepProtocol=next.optimiseKeepProtocol!==false;state.companionGoals=Array.isArray(next.companionGoals)?next.companionGoals:null;state.preferredCompanions=Array.isArray(next.preferredCompanions)?next.preferredCompanions:[];state.autoCompleteBuilds=Boolean(next.autoCompleteBuilds);state.autoPurchaseSlots=next.autoPurchaseSlots;state.purchasedSlots=next.purchasedSlots;state.loungePurchased=next.loungePurchased;state.novaLevel=next.novaLevel;state.rebirthTracker=next.rebirthTracker;syncCantinaPackUpgrades();autoPurchaseEligibleSlots()}
function saveLocal(){localStorage.setItem('droid-archive-mission-settings',JSON.stringify(normaliseMissionSettings(state.missionSettings)));state.iconicTraits=rememberIconicTraits(state.iconicTraits,state.owned,state.droids);for(const row of state.owned){const d=state.droids.find(d=>d.name===row.name);const trait=normaliseTrait(row.trait,d)||(isIconic(d)?state.iconicTraits[row.name]:null);if(trait)row.trait=trait;else delete row.trait;}localStorage.setItem('droid-archive-iconic-traits',JSON.stringify(state.iconicTraits));localStorage.setItem('droid-archive-event-progress',JSON.stringify(normaliseEventProgress(state.eventProgress)));localStorage.setItem('droid-archive-party',JSON.stringify(normaliseParty(state.party)));localStorage.setItem('droid-archive-fusion-preferences',JSON.stringify(normaliseFusionPreferences(state.fusionPreferences)));localStorage.setItem('droid-archive-notification-preferences',JSON.stringify(normaliseNotificationPreferences(state.notificationPreferences)));localStorage.setItem('droid-archive-astromech-iconic-roles',JSON.stringify(normaliseAstromechIconicRoles(state.astromechIconicRoles)));localStorage.setItem('droid-archive-fusion-keep-rules',JSON.stringify(state.fusionKeepRules||[]));localStorage.setItem('droid-archive-protocol-priority',state.protocolPriority||'credits');localStorage.setItem('droid-archive-owned',JSON.stringify(state.owned));localStorage.setItem('droid-archive-blueprints',JSON.stringify(state.blueprints));localStorage.setItem('droid-archive-droidex',JSON.stringify(state.droidex));localStorage.setItem('droid-archive-nova-upgrades',JSON.stringify(state.novaUpgrades));localStorage.setItem('droid-archive-nova-iconic-unlocks',JSON.stringify(normaliseNovaIconicUnlocks(state.novaIconicUnlocks)));localStorage.setItem('droid-archive-cantina-purchases',JSON.stringify(state.cantinaPurchases));localStorage.setItem('droid-archive-cantina-pack-grants',JSON.stringify(state.cantinaPackGrants));localStorage.setItem('droid-archive-multiplier',state.multiplier);localStorage.setItem('droid-archive-cycle',state.cycle);localStorage.setItem('droid-archive-rebirth',state.rebirth);localStorage.setItem('droid-archive-super-rebirth-goal',state.superRebirthGoal);localStorage.setItem('droid-archive-optimise-free-build',state.optimiseFreeBuild?'1':'0');localStorage.setItem('droid-archive-optimise-fuse-first',state.optimiseFuseFirst===false?'0':'1');localStorage.setItem('droid-archive-optimise-include-iconics',state.optimiseIncludeIconics?'1':'0');localStorage.setItem('droid-archive-fusion-as-lounge',state.fusionAsLounge?'1':'0');localStorage.setItem('droid-archive-show-regional-production',state.showRegionalProduction===false?'0':'1');localStorage.setItem('droid-archive-optimise-free-build-mode',state.optimiseFreeBuildMode);localStorage.setItem('droid-archive-optimise-min-gain',String(optimiseMinGainPercent()));localStorage.setItem('droid-archive-optimise-keep-droidex',state.optimiseKeepDroidex===false?'0':'1');localStorage.setItem('droid-archive-optimise-keep-protocol',state.optimiseKeepProtocol===false?'0':'1');localStorage.setItem('droid-archive-companion-goals',JSON.stringify(state.companionGoals||null));localStorage.setItem('droid-archive-preferred-companions',JSON.stringify(state.preferredCompanions||[]));localStorage.setItem('droid-archive-auto-complete-builds',state.autoCompleteBuilds?'1':'0');localStorage.setItem('droid-archive-auto-purchase-slots',state.autoPurchaseSlots?'1':'0');localStorage.setItem('droid-archive-purchased-slots',JSON.stringify(state.purchasedSlots));localStorage.setItem('droid-archive-lounge-purchased',state.loungePurchased);localStorage.setItem('droid-archive-nova-level',state.novaLevel);localStorage.setItem('droid-archive-rebirth-tracker',JSON.stringify(state.rebirthTracker));localStorage.setItem('droid-archive-theme',state.theme);localStorage.setItem('droid-archive-active-profile',state.cloud.activeProfileId||'');localStorage.setItem('droid-archive-sync-provider',state.cloud.enabled?'supabase':'local');if(state.cloud.fileId)localStorage.setItem('droid-archive-cloud-file-id',state.cloud.fileId)}
function localDocFromCurrent(name='Main'){const id=cloudId();return{app:'Droid Archives',version:1,updatedAt:new Date().toISOString(),activeProfileId:id,profiles:[{id,name,updatedAt:new Date().toISOString(),data:profileDataFromState()}]}}
function normalizeProfileDoc(doc){if(!doc||!Array.isArray(doc.profiles)||!doc.profiles.length)return localDocFromCurrent();doc.profiles=doc.profiles.map((p,i)=>({id:p.id||`profile-${Date.now()}-${i}`,name:p.name||`Profile ${i+1}`,updatedAt:p.updatedAt||new Date().toISOString(),data:{eventProgress:normaliseEventProgress(p.data?.eventProgress),party:normaliseParty(p.data?.party),owned:p.data?.owned||[],blueprints:p.data?.blueprints||[],droidex:p.data?.droidex||[],novaUpgrades:p.data?.novaUpgrades||{},novaIconicUnlocks:normaliseNovaIconicUnlocks(p.data?.novaIconicUnlocks),missionSettings:normaliseMissionSettings(p.data?.missionSettings),iconicTraits:p.data?.iconicTraits||{},cantinaPurchases:p.data?.cantinaPurchases||{},cantinaPackGrants:p.data?.cantinaPackGrants||{},multiplier:p.data?.multiplier??1,cycle:p.data?.cycle??0,rebirth:p.data?.rebirth??0,superRebirthGoal:p.data?.superRebirthGoal??30,astromechIconicRoles:normaliseAstromechIconicRoles(p.data?.astromechIconicRoles),fusionKeepRules:normaliseFusionKeepRules(p.data?.fusionKeepRules),fusionPreferences:normaliseFusionPreferences(p.data?.fusionPreferences),notificationPreferences:normaliseNotificationPreferences(p.data?.notificationPreferences),protocolPriority:p.data?.protocolPriority==='crafting'?'crafting':'credits',optimiseFreeBuild:Boolean(p.data?.optimiseFreeBuild),optimiseFuseFirst:p.data?.optimiseFuseFirst!==false,optimiseIncludeIconics:Boolean(p.data?.optimiseIncludeIconics),fusionAsLounge:Boolean(p.data?.fusionAsLounge),showRegionalProduction:p.data?.showRegionalProduction!==false,optimiseFreeBuildMode:p.data?.optimiseFreeBuildMode||'upgrade-cost',optimiseMinGainPercent:Number.isFinite(Number(p.data?.optimiseMinGainPercent))?Number(p.data.optimiseMinGainPercent):0.5,optimiseKeepDroidex:p.data?.optimiseKeepDroidex!==false,optimiseKeepProtocol:p.data?.optimiseKeepProtocol!==false,companionGoals:Array.isArray(p.data?.companionGoals)?p.data.companionGoals:null,preferredCompanions:Array.isArray(p.data?.preferredCompanions)?p.data.preferredCompanions:[],autoCompleteBuilds:Boolean(p.data?.autoCompleteBuilds),autoPurchaseSlots:p.data?.autoPurchaseSlots===undefined?true:Boolean(p.data.autoPurchaseSlots),purchasedSlots:Array.isArray(p.data?.purchasedSlots)?p.data.purchasedSlots:[],loungePurchased:p.data?.loungePurchased??0,novaLevel:p.data?.novaLevel??0,rebirthTracker:normalizeRebirthTracker(p.data?.rebirthTracker)}}));doc.activeProfileId=doc.activeProfileId&&doc.profiles.some(p=>p.id===doc.activeProfileId)?doc.activeProfileId:doc.profiles[0].id;doc.updatedAt=doc.updatedAt||new Date().toISOString();return doc}
function ensureLocalDoc(){if(!state.localDoc){try{state.localDoc=normalizeProfileDoc(JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY)||'null'))}catch{state.localDoc=localDocFromCurrent()}if(!state.cloud.activeProfileId||!state.localDoc.profiles.some(p=>p.id===state.cloud.activeProfileId))state.cloud.activeProfileId=state.localDoc.activeProfileId;writeLocalDoc()}return state.localDoc}
function writeLocalDoc(){if(!state.localDoc)return;state.localDoc.activeProfileId=state.cloud.activeProfileId;state.localDoc.updatedAt=new Date().toISOString();localStorage.setItem(LOCAL_PROFILES_KEY,JSON.stringify(state.localDoc))}
function cacheCloudDocLocally(){if(!state.cloud.doc)return;state.localDoc=normalizeProfileDoc(cloneProfileData(state.cloud.doc));state.localDoc.activeProfileId=state.cloud.activeProfileId;writeLocalDoc()}
function cloudConnected(){return Boolean(state.cloud.user&&state.cloud.doc&&!state.cloud.profileRestoreBlocked)}
function cloudNeedsLogin(){return state.cloud.enabled&&!cloudConnected()&&!state.cloud.reconnecting}
function activeProfileDoc(){return cloudConnected()?state.cloud.doc:ensureLocalDoc()}
function activeProfile(){const doc=activeProfileDoc();return doc?.profiles?.find(x=>x.id===state.cloud.activeProfileId)||doc?.profiles?.[0]}
function updateActiveLocalProfile(){const doc=ensureLocalDoc(),profile=doc.profiles.find(x=>x.id===state.cloud.activeProfileId);if(profile&&!cloudConnected()){profile.data=profileDataFromState();profile.updatedAt=new Date().toISOString();doc.activeProfileId=profile.id;writeLocalDoc()}}
function activeCloudProfile(){return state.cloud.doc?.profiles?.find(x=>x.id===state.cloud.activeProfileId)}
function updateActiveCloudProfile(){if(state.cloud.profileRestoreBlocked)return;const profile=activeCloudProfile();if(profile){profile.data=profileDataFromState();profile.updatedAt=new Date().toISOString()}}
function cloudId(){return globalThis.crypto?.randomUUID?.()||`profile-${Date.now()}-${Math.random().toString(36).slice(2)}`}
let cloudSaveTimer=null;
function markCloudSignedOut(message='SIGNED OUT — changes are local only'){unsubscribeCloudChanges();state.cloud.session=null;state.cloud.user=null;clearKyberPreview();state.cloud.doc=null;state.cloud.reconnecting=false;state.cloud.syncing=false;state.cloud.status=message;saveLocal();renderCloudHeader();renderBaseSidebar(()=>route())}
function scheduleCloudSave(){if(state.cloud.profileRestoreBlocked)return;if(state.cloud.enabled&&!cloudConnected()){state.cloud.status='SIGNED OUT — changes save locally only';renderCloudHeader();return}if(!cloudConnected())return;clearTimeout(cloudSaveTimer);state.cloud.status='Unsynced changes';renderCloudHeader();cloudSaveTimer=setTimeout(()=>{cloudSaveTimer=null;cloudSaveNow().catch(e=>{state.cloud.syncing=false;state.cloud.status=e.message;renderCloudHeader();route()})},900)}
const save=()=>{
  setTimeout(refreshBackgroundOptimise,0);
  if(state.sharedView){state.sharedView.profile.data=profileDataFromState();state.sharedView.changeVersion=(state.sharedView.changeVersion||0)+1;if(state.sharedView.canEdit)scheduleSharedProfileSave();return}
  const persist=()=>{updateActiveLocalProfile();updateActiveCloudProfile();saveLocal()};
  try{persist()}catch(error){
    if(error.name!=='QuotaExceededError'||!archiveExperience)throw error;
    archiveExperience.releaseHistory();persist();
  }
  archiveExperience?.checkpoint();scheduleCloudSave();
};
const isDroidFlawless=name=>state.droidex.some(x=>x.name===name&&x.flawless);
const flawlessCount=()=>new Set(state.droidex.filter(x=>x.flawless&&!isIconic(state.droids.find(d=>d.name===x.name))).map(x=>x.name)).size;
const flawlessCapacity=()=>state.droids.filter(d=>!onlyDefaultVariant(d)).length;
const regularRebirthMultiplier=(rebirth=state.rebirth)=>Math.round((state.progression?.rebirthCreditBonuses||[]).slice(0,Math.max(0,rebirth)).reduce((sum,n)=>sum+n,0)*100)/100;
const usesDefaultMultiplier=(value=state.multiplier)=>!Number.isFinite(Number(value))||Number(value)<=1;
const rebirthMultiplierAt=(current,from,to)=>Math.max(1,Math.round(((usesDefaultMultiplier(current)?1:Number(current))+regularRebirthMultiplier(to)-regularRebirthMultiplier(from))*1000000)/1000000);
const superRebirthMultiplier=()=>Math.max(1,Math.round((effectiveMultiplier()-regularRebirthMultiplier()+Number(rebirthReward(state.rebirth)?.creditMultPercent||0)/100)*1000000)/1000000);
function multiplierHelp(){return `Enter your current in-game total after setting your Rebirth. Regular Rebirths adjust it automatically. If you leave it at 1, the planner still works and the multiplier still increases with Rebirths. Reducing Rebirths or Super Rebirthing never takes it below 1. This is your final total: Nova, companion and event credit boosts are already included; we do not add them again. Regional Protocol and matching-station bonuses are applied separately. Recheck this total when your boosts change. Current Rebirth bonus: +${regularRebirthMultiplier().toFixed(2)}x; retained total: ${Math.max(1,state.multiplier-regularRebirthMultiplier()).toFixed(2)}x.`;}
const effectiveMultiplier=()=>usesDefaultMultiplier()?1:Number(state.multiplier);
const isIconic=d=>d?.rarity==='ICONIC'||d?.special?.onlyDefaultVariant;
const isFusion=d=>Boolean(d?.fusion);
// Which droids have a DEFAULT square and nothing else. Fusion droids are NOT
// among them: they come in every quality like anything else, you just cannot
// upgrade one quality into the next. Only having a default square is a
// different thing from only having a default *route in*.
const onlyDefaultVariant=d=>isIconic(d);
const droidexCapacity=()=>state.droids.reduce((total,d)=>total+(onlyDefaultVariant(d)?1:DISPLAY_VARIANTS.length),0);
const ICONIC_EFFECTS={'SCOURGE PRIME':'Work: Apply Hive Mind Bonus; credit Protocol links this region','WG-22':'2x Flawless Chance (Companion)','BB-8':'×2 Upgrade Chips on claim','MISTER BONES':'×2 Damage','IG-11 MARSHAL':'Blueprint Shield','DJ R-3X':'×2 World Quest Rewards','CB-23':'Secret Astromech Mission','R2-D2':'15% Astromech Mission Speed','C-3PO':'2× Droid Sell Value'};
const iconicIncome=d=>isIconic(d)?(d.special?.incomePercent??0.15):0;
// An Iconic droid earns its own percentage of the Base's total base income. That
// share is all it produces: it never increases what any other droid earns, so a
// droid's own rate is only its base income, the multiplier and its station match.
const placedBaseIncome=placed=>placed.reduce((sum,x)=>{const d=state.droids.find(y=>y.name===x.name);return sum+(isIconic(d)?0:(d?.variants[x.variant]?.income||0));},0);
const droidRate=(d,variant,station,baseIncome=0,unit=null)=>workingIncome({traitBonus:traitAmount(unit,0,station),base:d?.variants?.[variant]?.income||0,dynamicPercent:iconicIncome(d),staticIncome:baseIncome,matching:station===d?.type,multiplier:effectiveMultiplier()}).total;
const CHIP_COSTS={COMMON:{GOLD:10,DIAMOND:25,RAINBOW:40,BESKAR:80,GALACTIC:120,STELLAR:180,KYBER:240},RARE:{GOLD:30,DIAMOND:60,RAINBOW:100,BESKAR:250,GALACTIC:400,STELLAR:750,KYBER:1000},EPIC:{GOLD:120,DIAMOND:180,RAINBOW:240,BESKAR:2000,GALACTIC:5000,STELLAR:8000,KYBER:12000},LEGENDARY:{GOLD:400,DIAMOND:1200,RAINBOW:2500,BESKAR:6000,GALACTIC:16000,STELLAR:24000,KYBER:30000},MYTHIC:{GOLD:4000,DIAMOND:8000,RAINBOW:14000,BESKAR:30000,GALACTIC:60000,STELLAR:90000,KYBER:110000}};
const UPGRADE_CHIP_RATES={
  COMMON:{DEFAULT:2,GOLD:4,DIAMOND:6,RAINBOW:8,BESKAR:10,GALACTIC:12,STELLAR:14,KYBER:16},
  RARE:{DEFAULT:4,GOLD:8,DIAMOND:12,RAINBOW:16,BESKAR:20,GALACTIC:24,STELLAR:28,KYBER:32},
  EPIC:{DEFAULT:6,GOLD:12,DIAMOND:18,RAINBOW:24,BESKAR:30,GALACTIC:36,STELLAR:42,KYBER:48},
  LEGENDARY:{DEFAULT:8,GOLD:16,DIAMOND:24,RAINBOW:32,BESKAR:40,GALACTIC:48,STELLAR:56,KYBER:64},
  MYTHIC:{DEFAULT:10,GOLD:20,DIAMOND:30,RAINBOW:40,BESKAR:50,GALACTIC:60,STELLAR:70,KYBER:80}
};
const upgradeChipRate=(d,variant)=>UPGRADE_CHIP_RATES[d?.rarity]?.[variant==='SCOURGE'?'KYBER':baseVariant(variant)]||0;
// Upgrade Chips returned for selling a droid. Standard quality cannot be sold
// for chips, and Iconics have no quality tiers, so both fall through to 0.
const CHIP_SELL_VALUES={
  COMMON:{GOLD:4,DIAMOND:7,RAINBOW:10,BESKAR:13,GALACTIC:16,STELLAR:19,KYBER:22},
  RARE:{GOLD:6,DIAMOND:9,RAINBOW:12,BESKAR:15,GALACTIC:18,STELLAR:21,KYBER:24},
  EPIC:{GOLD:30,DIAMOND:33,RAINBOW:36,BESKAR:39,GALACTIC:42,STELLAR:45,KYBER:48},
  LEGENDARY:{GOLD:84,DIAMOND:87,RAINBOW:90,BESKAR:93,GALACTIC:96,STELLAR:99,KYBER:102},
  MYTHIC:{GOLD:192,DIAMOND:195,RAINBOW:198,BESKAR:201,GALACTIC:204,STELLAR:207,KYBER:210}
};
const baseChipSellValue=(d,variant)=>CHIP_SELL_VALUES[d?.rarity]?.[baseVariant(variant)]||0;
const chipSellBonusMultiplier=()=>1+Math.min(4,novaLevelFor('chip-sell-bonus'))*.5;
const chipSellValue=(d,variant)=>baseChipSellValue(d,variant)*chipSellBonusMultiplier()*partyBonuses(state.party).chips;
const bb8CompanionActive=placed=>placed.some(x=>companionPerkActive(x,'BB-8'));
const LUCKY_UPGRADE_CHANCES={COMMON:0.32,RARE:0.16,EPIC:0.08,LEGENDARY:0.04,MYTHIC:0.02};
const luckyChance=d=>LUCKY_UPGRADE_CHANCES[d?.rarity]||0;
const luckyChanceLabel=d=>`${Math.round(luckyChance(d)*100)}%`;
const variantLabel=v=>v==='KYBER'?'Kyber':String(v).toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const nextVariant=v=>v==='SCOURGE'?null:VARIANTS[variantRank(v)+1]||null;
const variantText=v=>`<span class="variant-text variant-${v.toLowerCase()}">${variantLabel(v)}</span>`;
const knownNumber=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const variantIncomeText=(d,v)=>isIconic(d)?`${Math.round(iconicIncome(d)*100)}% of Base income`:knownNumber(d?.variants?.[v]?.income)?`${fmt(d.variants[v].income)}/s`:'Unknown';
const variantCostText=(d,v)=>d.acquisition?.method==='event'?(d.acquisition.label||'Gonk Army reward'):isIconic(d)?'Nova Shop / rewards':knownNumber(d?.variants?.[v]?.cost)?`${fmt(d.variants[v].cost)} credits`:'Unknown';
const craftTimeText=seconds=>{const total=Math.round(Number(seconds)||0);if(!total)return '—';const hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),secs=total%60;return [hours&&`${hours}h`,(minutes||hours)&&`${minutes}m`,`${secs}s`].filter(Boolean).join(' ')};
const rarityLabel=r=>String(r||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const rarityClass=r=>`rarity-${String(r||'').toLowerCase()}`;
const rarityText=r=>`<span class="rarity-text ${rarityClass(r)}">${rarityLabel(r)}</span>`;
const rarityBadge=r=>`<span class="badge rarity-badge ${rarityClass(r)}">${rarityLabel(r)}</span>`;
const CREDIT_ICON='assets/events/Credits.png';
const creditAmount=n=>`<span class="credit-amount"><img src="${CREDIT_ICON}" alt="" loading="lazy">${fmt(n)} credits</span>`;
const maxRebirth=()=>Math.max(0,...(state.rebirths[state.cycle]||[]).map(rebirth=>Number(rebirth.to)||0),30);
const rebirthGoal=()=>Math.max(12,Math.min(maxRebirth(),Math.floor(Number(state.superRebirthGoal)||maxRebirth())));
const requirementWithinGoal=r=>Number(r.at??r.to)<=rebirthGoal();
function chipsToVariant(d,from,to){const start=variantRank(from),end=variantRank(to),costs=CHIP_COSTS[d.rarity]||{};if(start<0||end<=start)return 0;return VARIANTS.slice(start+1,end+1).reduce((sum,variant)=>sum+(costs[variant]||0),0)}
const OPTIMISE_FREE_BUILD_MODES=['upgrade-cost','rarity-income','unused-income'];
const optimiseFreeBuildMode=()=>OPTIMISE_FREE_BUILD_MODES.includes(state.optimiseFreeBuildMode)?state.optimiseFreeBuildMode:'upgrade-cost';
const optimiseFreeBuildModeLabel=mode=>({'upgrade-cost':'Highest upgrade cost','rarity-income':'Lowest rarity + earnings','unused-income':'No further use, lowest earnings'}[mode]||'Highest upgrade cost');
const optimiseFreeBuildModeHelp=mode=>({'upgrade-cost':'May sell droids needed for future Rebirths, starting with those that would cost the most Upgrade Chips to reach their required quality.','rarity-income':'May sell droids needed for future Rebirths, starting with the lowest-rarity and lowest-earning choices.','unused-income':'Never sells a droid that is still needed within your Super Rebirth Goal. It sells only droids with no further use, lowest earnings first; Build slots may remain occupied if safe storage is full.'}[mode]||'');
const rarityRank=d=>['COMMON','RARE','EPIC','LEGENDARY','MYTHIC','ICONIC'].indexOf(d?.rarity);
function futureUpgradeCostForUnit(unit,d){if(!d)return 0;const requirements=(state.rebirths[state.cycle]||[]).flatMap(r=>(r.requiredDroids||[]).filter(i=>i.droidName===unit.name&&r.to>state.rebirth&&r.to<=rebirthGoal()).map(i=>i.variant));if(!requirements.length)return 0;const target=requirements.reduce((best,variant)=>variantRank(variant)>variantRank(best)?variant:best,requirements[0]);return chipsToVariant(d,unit.variant,target)}
function optimiseStorageKeepScore(item){const d=state.droids.find(x=>x.name===item.unit.name),income=d?.variants[item.unit.variant]?.income||0;if(optimiseFreeBuildMode()==='rarity-income')return rarityRank(d)*1e9+income;if(optimiseFreeBuildMode()==='unused-income')return income;return -futureUpgradeCostForUnit(item.unit,d)}
function droidCycleStatus(d,ownedVariant,selected=true){const requirements=(state.rebirths[state.cycle]||[]).flatMap(r=>(r.requiredDroids||[]).filter(i=>i.droidName===d.name).map(i=>({at:r.to,variant:i.variant}))),future=requirements.filter(r=>r.at>state.rebirth&&requirementWithinGoal(r)),next=future.find(r=>r.at===state.rebirth+1),later=future.filter(r=>r.at>state.rebirth+1);if(!selected&&future.length)return{kind:'unused',label:'Duplicate · not used for rebirth'};if(next){const enough=rebirthVariantReady(ownedVariant,next.variant),chips=chipsToVariant(d,ownedVariant,next.variant);return enough?{kind:'current',label:`Next R: ${next.at} ${requirementVariantText(next.variant)}`}:{kind:'current-short',label:`Next R: ${next.at} · ${rebirthActionText(d,ownedVariant,next.variant,chips)}`}}if(!later.length)return{kind:'unused',label:'No further rebirth use'};const max=later.reduce((best,item)=>variantRank(item.variant)>variantRank(best.variant)?item:best,later[0]),enough=rebirthVariantReady(ownedVariant,max.variant),chips=chipsToVariant(d,ownedVariant,max.variant),rebirths=[...new Set(later.map(item=>item.at))].join(', ');return enough?{kind:'ready',label:`Ready through R: ${max.at} ${requirementVariantText(max.variant)}`}:{kind:'upgrade',label:`R: ${rebirths} · ${rebirthActionText(d,ownedVariant,max.variant,chips)}`}}
const FUSION_REBIRTH=3;
// Three Fusion Build slots, unlocked three different ways: the first comes with
// the room, the second with Fusion Tank 1, the third with Fusion Tank 2.
const FUSION_BUILD_SLOTS=3;
const PROTOCOL_REGIONS=['WORKER','ASTROMECH','BATTLE'];
// Purchase costs are reference data only; slot availability follows rebirth and
// the profile's existing purchase settings. Worker Crafting R14 is provisional.
const PROTOCOL_SLOT_DATA={
  WORKER:{CREDITS:{unlockRebirth:2,costCredits:500000},CRAFTING:{unlockRebirth:14,costCredits:11000000000,unlockRebirthProvisional:true}},
  ASTROMECH:{CREDITS:{unlockRebirth:6,costCredits:10000000},CRAFTING:{unlockRebirth:18,costCredits:280000000000}},
  BATTLE:{CREDITS:{unlockRebirth:10,costCredits:400000000},CRAFTING:{unlockRebirth:22,costCredits:3900000000000}}
};
const PROTOCOL_SLOTS=Object.fromEntries(PROTOCOL_REGIONS.flatMap((region,buildSlot)=>['CREDITS','CRAFTING'].map(role=>[
  `PROTOCOL_${region}_${role}`,{region,buildSlot,role,...PROTOCOL_SLOT_DATA[region][role],label:`${region[0]+region.slice(1).toLowerCase()} Protocol · ${role==='CREDITS'?'Credits':'Crafting'}`}
])));
const isProtocolStation=station=>Boolean(PROTOCOL_SLOTS[station]);
const protocolNumber=value=>Number(value)===0?'0':fmt(value);
const canUseStation=(d,station)=>!isProtocolStation(station)||d?.type==='PROTOCOL';
const protocolBonus=(d,variant,role)=>Number(d?.variants?.[variant]?.[role==='CREDITS'?'protocolCpsBonusPercent':'protocolCraftingBonusPercent'])||0;
const protocolSlotHint=station=>{const slot=PROTOCOL_SLOTS[station];return slot.role==='CREDITS'?`Boosts credits made in the ${stationName(slot.region)} region. ×1.56 means 56% extra credits.`:`Speeds up Build ${slot.buildSlot+1} in the ${stationName(slot.region)} region. Other Build slots are unaffected.`};
const protocolVariantText=(d,variant,station)=>{if(d?.name==='SCOURGE PRIME')return PROTOCOL_SLOTS[station]?.role==='CREDITS'?'3x regional credits + Hive Mind links':'+40/s Build speed + Hive Mind count';const role=PROTOCOL_SLOTS[station]?.role||'CREDITS',value=protocolBonus(d,variant,role);return value?role==='CREDITS'?`×${(1+value/100).toFixed(2)} region credits`:`+${fmt(value/100)}/s Build speed`:'Bonus not published';};
function protocolPrioritySetting(id='protocolPriority'){return `<label class="side-field">Protocol priority<select id="${id}"><option value="credits" ${state.protocolPriority!=='crafting'?'selected':''}>Higher credit gain</option><option value="crafting" ${state.protocolPriority==='crafting'?'selected':''}>Higher craft speed</option></select><small class="flawless-bonus">Uses your strongest Protocol bonuses for the selected priority, then improves the other bonus. Credit choices account for each region’s earnings.</small></label>`;}
function protocolRegionMultiplier(placed,region){
  const unit=placed.find(x=>x.station===`PROTOCOL_${region}_CREDITS`),d=unit&&state.droids.find(d=>d.name===unit.name);
  return 1+(d?.type==='PROTOCOL'?protocolBonus(d,unit.variant,'CREDITS')/100:0);
}
function protocolCraftBonus(placed,buildSlot){
  const region=PROTOCOL_REGIONS[buildSlot],unit=placed.find(x=>x.station===`PROTOCOL_${region}_CRAFTING`),d=unit&&state.droids.find(d=>d.name===unit.name);
  return d?.type==='PROTOCOL'?protocolBonus(d,unit.variant,'CRAFTING')/100:0;
}
function regionalIncome(placed){
  const productive=placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),base=placedBaseIncome(productive),hiveState=placedHive(placed,state.droids);
  const regions=Object.fromEntries(PROTOCOL_REGIONS.map(region=>[region,{raw:0,matchingBonus:0,beforeBonus:0,bonus:0,total:0,multiplier:protocolRegionMultiplier(placed,region),hive:0,droids:[]}]));
  for(const unit of productive){const d=state.droids.find(d=>d.name===unit.name);if(!d)continue;
    const row=workingIncome({base:d.variants[unit.variant]?.income||0,dynamicPercent:iconicIncome(d),staticIncome:base,traitBonus:traitAmount(unit,0),matching:d.type===unit.station,multiplier:effectiveMultiplier()});
    const hive=row.raw*hiveState.bonusFor(unit);
    const region=regions[unit.station];region.hive+=hive;region.raw+=row.raw;region.matchingBonus+=row.matched-row.raw;region.beforeBonus+=row.total;
    region.droids.push({...unit,raw:row.raw,matching:row.matched-row.raw,total:row.total*region.multiplier+hive});
  }
  for(const region of Object.values(regions)){region.bonus=region.beforeBonus*(region.multiplier-1);region.total=region.beforeBonus+region.bonus+region.hive;}
  return regions;
}
function incomeBreakdownHtml(placed){
  const regions=regionalIncome(placed),rows=Object.values(regions),raw=rows.reduce((n,r)=>n+r.raw,0),matching=rows.reduce((n,r)=>n+r.matchingBonus,0),protocol=rows.reduce((n,r)=>n+r.bonus,0),total=rows.reduce((n,r)=>n+r.total,0);
  return `<details class="income-breakdown"><summary>How your income is calculated</summary><p>Raw working income ${fmt(raw)}/s + matching-station bonus ${fmt(matching)}/s, multiplied by your entered total ${fmt(effectiveMultiplier())} times, then +${fmt(protocol)}/s from regional Protocol: <strong>${fmt(total)}/s passive income</strong>.</p><p>${multiplierHelp()}</p><p>Working trait bonuses are included per droid. Hive Mind adds ${fmt(rows.reduce((n,r)=>n+r.hive,0))}/s from ${placedHive(placed,state.droids).count} effective Hive Mind members, including Scourge Prime, regional links and Hive Mind Master. Its bonus is added after credit, matching and Protocol multipliers. Passive Credits companions add ${fmt(passiveTraitIncome(placed))}/s averaged over their five-second payments, separately from working income.</p><p>Iconic income uses the higher of its own base rate or its percentage of ${fmt(placedBaseIncome(placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station))))}/s from non-Iconic working droids. Matching stations also give Iconics +10%. Lounge, companions and unfinished builds do not generate passive credits.</p><table><thead><tr><th>Droid / region</th><th>Before boosts</th><th>Final / second</th></tr></thead><tbody>${Object.entries(regions).flatMap(([name,row])=>row.droids.map(u=>`<tr><td>${escapeAttr(u.name)} &middot; ${variantText(u.variant)} &middot; ${stationName(name)}</td><td>${fmt(u.raw)}</td><td>${fmt(u.total)}</td></tr>`)).join('')}</tbody></table></details>`;
}
function incomeForPlaced(placed){return Object.values(regionalIncome(placed)).reduce((sum,region)=>sum+region.total,0)+passiveTraitIncome(placed);}
function passiveTraitIncome(placed){return placed.reduce((sum,u)=>sum+(state.droids.find(d=>d.name===u.name)?.variants?.[u.variant]?.income||0)*traitAmount(u,11)/5,0)*effectiveMultiplier();}
const unitCompanionGoal=(unit,goal)=>{const d=state.droids.find(d=>d.name===unit.name);return companionGoalValue(d,unit,goal,companionAttributeValue(d,unit.variant));};
// Protocol slots sit inside the card for their region, after a divider, the same
// way the Battle second floor and the Worker outer platform do. They keep their
// own station ids, so the picker, drag and drop and removal work as before.
function protocolSlotsHtml(type,renderSlot){
  if(!PROTOCOL_REGIONS.includes(type))return'';
  return `<div class="upper-level-divider protocol-divider"><span>Protocol</span></div>${renderSlot(`PROTOCOL_${type}_CREDITS`,0)}${renderSlot(`PROTOCOL_${type}_CRAFTING`,0)}`;
}
let craftingEventMultiplier=1;
const estimateCraft=(droid,variant,station,slot,placed)=>craftingEstimate({droid,variant,station,slot,placed,droids:state.droids,novaUpgrades:state.novaUpgrades,eventMultiplier:craftingEventMultiplier});
function craftBreakdown(estimate,station){
  if(station==='FUSION_BUILD')return `Base ${craftTimeText(estimate.base)} / ${estimate.speed.toFixed(2)} fusion speed${estimate.doBonus<1?' / 2 from D-O':''}`;
  return `${estimate.speed.toFixed(2)}x craft speed${estimate.match<1?' · 10% matching-depot time reduction':''}`;
}
function craftingSummaryHtml(placed){
  const worker=placed.filter(x=>x.station==='COMPANION').reduce((sum,u)=>{const d=state.droids.find(d=>d.name===u.name);return sum+(d?.type==='WORKER'?companionAttributeValue(d,u.variant)*overclockFactor(u):0);},0);
  const nova=.1*novaLevelFor('crafting-speed'),traitCraft=traitSum(placed,3),fusion=1+novaLevelFor('fusion-speed'),hasDO=placed.some(x=>companionPerkActive(x,'D-O'));
  return `<section class="panel protocol-summary crafting-summary"><h2>Crafting estimates</h2><p>Nova crafting: +${Math.round(nova*100)}% · Worker companions: +${Math.round(worker*100)}% · Trait crafting: +${Math.round(traitCraft*100)}% &middot; Fusion speed: ${fusion}x${hasDO?' · D-O halves fusion time':''}</p><label class="side-field">Active crafting event multiplier <input data-crafting-event type="number" min="1" max="100" step="0.1" value="${craftingEventMultiplier}" style="max-width:100px"><small>1 = no boost, 1.5 = +50%, 2 = +100%. Set the active boost, not tokens owned. This estimate setting lasts until you reload.</small></label><div class="protocol-summary-grid">${PROTOCOL_REGIONS.map((region,slot)=>`<div><h3>Build ${slot+1} · ${stationName(region)}</h3><strong>${((1+nova+worker+traitCraft+protocolCraftBonus(placed,slot))*craftingEventMultiplier).toFixed(2)}x speed</strong><small>Protocol adds +${protocolCraftBonus(placed,slot).toFixed(2)}/s before the event boost.</small></div>`).join('')}</div><p>Build cards and map details show the time for a full passive build using these bonuses. They are not remaining-time countdowns. Pickaxe hits, critical hits and rushes can finish builds sooner. Nova Crafting Speed, Worker companions and crafting events do not speed up fusion.</p><a href="#/nova-shop">Edit your Nova Shop levels</a></section>`;
}

function protocolSummaryHtml(placed){
  // Hideable from Advanced settings. The stations still show their own bonuses.
  if(state.showRegionalProduction===false)return'';
  const regions=regionalIncome(placed);
  return `<section class="panel protocol-summary"><h2>Regional production</h2><div class="protocol-summary-grid">${PROTOCOL_REGIONS.map((region,slot)=>{
    const row=regions[region],bonus=protocolCraftBonus(placed,slot),build=placed.find(x=>x.station==='BUILD'&&x.slot===slot),d=build&&state.droids.find(d=>d.name===build.name),seconds=d?.variants?.[build?.variant]?.craftingSeconds;
    return `<div><h3>${stationName(region)}</h3><strong>${protocolNumber(row.total)}/s</strong><small>${protocolNumber(row.beforeBonus)}/s × ${row.multiplier.toFixed(2)} · +${protocolNumber(row.bonus)}/s from Protocol</small><span>Build ${slot+1}: +${protocolNumber(bonus)}/s crafting</span>${seconds?`<small>${build.name}: ${craftTimeText(estimateCraft(d,build.variant,'BUILD',slot,placed).seconds)} passive (${craftTimeText(seconds)} base)</small>`:''}</div>`;
  }).join('')}</div><p class="protocol-note">Craft estimates include your Nova levels, companions, matching depot and selected event multiplier. Bonus slots are separate from normal credit work slots.</p></section>`;
}
function protocolProductionHtml(d,variant,station,placed){
  const slot=PROTOCOL_SLOTS[station],bonus=protocolBonus(d,variant,slot.role),region=regionalIncome(placed)[slot.region];
  return `<span>${variantText(variant)} · Protocol</span><span class="adjusted-production">${protocolVariantText(d,variant,station)}</span><span class="production-breakdown">${bonus?slot.role==='CREDITS'?`+${fmt(region.bonus)}/s across ${stationName(slot.region)}`:`Build ${slot.buildSlot+1} only · ${(1+bonus/100).toFixed(2)}× base craft speed`:'This droid’s regional bonus is not yet published'}</span>`;
}
function protocolDetailHtml(d){
  if(d.type!=='PROTOCOL')return '';
  return `<h2>Protocol bonuses</h2><p>Assign to a regional Credits slot or the Crafting slot behind its Build station. Each slot activates its own bonus.</p><table><thead><tr><th>Quality</th><th>Region credits</th><th>Build crafting speed</th></tr></thead><tbody>${Object.entries(d.variants).map(([variant])=>`<tr><td>${variantText(variant)}</td><td>${protocolVariantText(d,variant,'PROTOCOL_WORKER_CREDITS')}</td><td>${protocolVariantText(d,variant,'PROTOCOL_WORKER_CRAFTING')}</td></tr>`).join('')}</tbody></table>`;
}
// Credits and regional boosts are coupled: moving an earner changes the value
// of its region's Protocol. Evaluate whole layouts, including opportunity cost.
// Deterministic improving moves/swaps give a bounded estimate, not a claim of
// a globally optimal solution to this nonlinear assignment problem.
function normaliseAstromechIconicRoles(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter(([,role])=>role==='mission'||role==='credits'));
}
function astromechIconicRole(name){return normaliseAstromechIconicRoles(state.astromechIconicRoles)[name]==='credits'?'credits':'mission';}
function missionIconic(d){return d?.type==='ASTROMECH'&&isIconic(d)&&astromechIconicRole(d.name)==='mission';}
function missionSlotBadge(type,index){return type==='ASTROMECH'&&ASTROMECH_MISSION_SLOTS.includes(index)?`<span class="mission-slot-badge" title="Astromech slot ${index+1} can run missions">Mission slot ${ASTROMECH_MISSION_SLOTS.indexOf(index)+1}</span>`:'';}
function optimiseBase(p,currentIncome){
  const keyOf=x=>`${x.source}:${x.unit}`,fixed=p.placed.filter(x=>x.lockedSlot||isBuilding(x)),fixedKeys=new Set(fixed.map(keyOf));
  const missionSlots=stationSlotIndices('ASTROMECH').filter(slot=>ASTROMECH_MISSION_SLOTS.includes(slot)&&!fixed.some(x=>x.station==='ASTROMECH'&&x.slot===slot));
  const rank=name=>name==='R2-D2'?0:name==='CB-23'?1:2;
  // The Companions an activity asks for are settled first: they leave whatever
  // job they had, and the search fills the base without them.
  const activityChoice=companionActivityPicks(p),activityPicks=activityChoice.picks,activityKeys=new Set(activityPicks.map(keyOf));
  const candidates=expandedOwned().filter(x=>{const d=state.droids.find(d=>d.name===x.name);return d?.type==='ASTROMECH'&&(!isIconic(d)||missionIconic(d))&&!fixedKeys.has(keyOf(x))&&!activityKeys.has(keyOf(x));})
    .sort((a,b)=>rank(a.name)-rank(b.name)||missionProgress({...b,station:'ASTROMECH',slot:0},state.droids.find(d=>d.name===b.name)).progress-missionProgress({...a,station:'ASTROMECH',slot:0},state.droids.find(d=>d.name===a.name)).progress||a.name.localeCompare(b.name));
  const picks=candidates.slice(0,missionSlots.length),used=new Set(),reservations=[];
  // Preserve existing mission positions first; a non-mission position is never
  // a reason to displace one of these assignments for a higher credit earner.
  for(const unit of picks){const old=p.placed.find(x=>keyOf(x)===keyOf(unit));if(old?.station==='ASTROMECH'&&missionSlots.includes(old.slot)&&!used.has(old.slot)){used.add(old.slot);reservations.push({...unit,station:'ASTROMECH',slot:old.slot});}}
  for(const unit of picks)if(!reservations.some(x=>keyOf(x)===keyOf(unit))){const slot=missionSlots.find(x=>!used.has(x));used.add(slot);reservations.push({...unit,station:'ASTROMECH',slot});}
  // Traits which activate a companion perk at work must survive the credit search.
  // Mission reservations take precedence; they already activate these work traits.
  for(const unit of activityChoice.working||[]){
    if(fixedKeys.has(keyOf(unit))||reservations.some(x=>keyOf(x)===keyOf(unit)))continue;
    const old=p.placed.find(x=>keyOf(x)===keyOf(unit)),d=state.droids.find(x=>x.name===unit.name);
    const spots=productiveStations().filter(spot=>!fixed.some(x=>x.station===spot.station&&x.slot===spot.slot)&&!reservations.some(x=>x.station===spot.station&&x.slot===spot.slot));
    spots.sort((a,b)=>Number(b.station===old?.station&&b.slot===old?.slot)-Number(a.station===old?.station&&a.slot===old?.slot)||Number(b.station===d?.type)-Number(a.station===d?.type));
    if(!spots.length){
      // If every free work slot became a mission reservation, keep the requested
      // activity perk and release the lowest-priority mission pick for replanning.
      const index=reservations.findLastIndex(x=>!activityChoice.working.some(u=>keyOf(u)===keyOf(x)));
      if(index>=0){const displaced=reservations.splice(index,1)[0];spots.push({station:displaced.station,slot:displaced.slot});}
    }
    if(spots[0])reservations.push({...unit,...spots[0],activityPerk:true});
  }
  for(const unit of activityPicks)reservations.push({...unit,companionActivity:true});
  if(!reservations.length){
    const result=repairReachableLayout(optimiseUnreservedBase(p,currentIncome),p);
    return {...result,moves:optimiseAssignmentMoves(result.assignments,p)};
  }
  const keys=new Set(reservations.map(keyOf)),spots=new Set(reservations.map(x=>`${x.station}:${x.slot}`));
  const constrained={...p,placed:[...p.placed.filter(x=>!keys.has(keyOf(x))&&!spots.has(`${x.station}:${x.slot}`)),...reservations.map(x=>({...x,lockedSlot:true}))]};
  const result=repairReachableLayout(optimiseUnreservedBase(constrained,currentIncome),constrained);
  const assignments=[...result.assignments,...reservations.map(x=>({key:keyOf(x),name:x.name,variant:x.variant,station:x.station,slot:x.slot,...(x.companionActivity?{companionActivity:true}:x.activityPerk?{}:{missionPriority:true})}))];
  return {...result,assignments,moves:optimiseAssignmentMoves(assignments,p)};
}
function optimiseUnreservedBase(p,currentIncome){
  const initial=optimiseCreditBase(p,currentIncome);
  if(!expandedOwned().some(x=>state.droids.find(d=>d.name===x.name)?.type==='PROTOCOL'))return initial;
  const keyOf=x=>`${x.source}:${x.unit}`,locked=p.placed.filter(x=>x.lockedSlot||isBuilding(x)),lockedKeys=new Set(locked.map(keyOf)),blocked=new Set(locked.map(x=>`${x.station}:${x.slot}`));
  const units=expandedOwned().filter(x=>!lockedKeys.has(keyOf(x))).map(x=>({...x,key:keyOf(x),droid:state.droids.find(d=>d.name===x.name)}));
  const slots=[...productiveStations(),...Object.keys(PROTOCOL_SLOTS).flatMap(station=>stationSlotIndices(station).map(slot=>({station,slot})))].filter(x=>!blocked.has(`${x.station}:${x.slot}`));
  const byKey=new Map(units.map((x,i)=>[x.key,i]));
  const seedFrom=list=>slots.map(slot=>{const pick=list.find(x=>x.station===slot.station&&x.slot===slot.slot);return pick?byKey.get(pick.key)??-1:-1;});
  const allowed=(index,slot)=>index<0||canUseStation(units[index].droid,slot.station)&&(!isProtocolStation(slot.station)||protocolBonus(units[index].droid,units[index].variant,PROTOCOL_SLOTS[slot.station].role)>0);
  const layout=a=>[...locked,...a.flatMap((index,i)=>index<0?[]:[{...units[index],...slots[i]}])];
  const craftSeconds=PROTOCOL_REGIONS.map((_,slot)=>{const build=p.placed.find(x=>x.station==='BUILD'&&x.slot===slot&&isBuilding(x));const d=state.droids.find(d=>d.name===build?.name);return (d?.variants?.[build?.variant]?.craftingSeconds||0)*(d?.type===PROTOCOL_REGIONS[slot]?.9:1);});
  // Charge the move threshold for reshuffling working droids. Idle earners
  // can fill an empty work slot even when their gain is below that threshold.
  const craftBaseSpeed=1+traitSum(p.placed,3)+.1*(Number(state.novaUpgrades?.['crafting-speed'])||0)+p.placed.filter(x=>x.station==='COMPANION').reduce((sum,u)=>{const d=state.droids.find(d=>d.name===u.name);return sum+(d?.type==='WORKER'?companionAttributeValue(d,u.variant)*overclockFactor(u):0);},0);
  const lambda=optimiseMoveLambda(currentIncome),currentStation=new Map(p.placed.map(x=>[keyOf(x),x.station]));
  const scoreSlot=slot=>({...slot,region:PROTOCOL_REGIONS.indexOf(slot.station),creditRegion:PROTOCOL_SLOTS[slot.station]?.role==='CREDITS'?PROTOCOL_REGIONS.indexOf(PROTOCOL_SLOTS[slot.station].region):-1,craftRegion:PROTOCOL_SLOTS[slot.station]?.role==='CRAFTING'?PROTOCOL_REGIONS.indexOf(PROTOCOL_SLOTS[slot.station].region):-1});
  const scoreUnit=unit=>{const d=unit.droid||state.droids.find(d=>d.name===unit.name),station=currentStation.get(keyOf(unit));return {prime:unit.name==='SCOURGE PRIME',hiveTrait:traitAmount(unit,26,'WORKER'),scourge:unit.variant==='SCOURGE',base:d?.variants[unit.variant]?.income||0,type:d?.type,iconic:isIconic(d),dynamic:iconicIncome(d),traitBonus:traitAmount(unit,0,'WORKER'),creditBonus:d?.type==='PROTOCOL'?protocolBonus(d,unit.variant,'CREDITS')/100:0,craftBonus:d?.type==='PROTOCOL'?protocolBonus(d,unit.variant,'CRAFTING')/100:0,station,movingCosts:PRODUCTIVE_STATIONS.includes(station)||isProtocolStation(station)||d?.type==='PROTOCOL'};};
  const score=createAssignmentScorer({units:units.map(scoreUnit),slots:slots.map(scoreSlot),locked:locked.map(unit=>({...scoreUnit(unit),...scoreSlot(unit)})),regions:PROTOCOL_REGIONS,multiplier:effectiveMultiplier(),lambda,craftSeconds,craftBaseSpeed,craftingPriority:state.protocolPriority==='crafting'});
  const better=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]>b[i]+1e-7)return true;if(a[i]<b[i]-1e-7)return false;}return false;};
  // Two starting points: the credit layout and the base as it stands. A search
  // that only ever starts from the credit layout can commit to a region flip in
  // its first step that no later single move undoes.
  const seeds=[seedFrom(initial.assignments),seedFrom(p.placed.filter(x=>!lockedKeys.has(keyOf(x))).map(x=>({...x,key:keyOf(x)})))];
  // Prime's best region depends on the droids we subsequently move into it.
  // Try each legal credit region even when swapping Protocols alone loses
  // income: the following climb can then regroup Iconics and Hive members.
  const primeIndex=units.findIndex(u=>u.name==='SCOURGE PRIME');
  if(primeIndex>=0)for(const seed of [...seeds]){
    const from=seed.indexOf(primeIndex);
    for(let to=0;to<slots.length;to++){
      if(to===from||PROTOCOL_SLOTS[slots[to].station]?.role!=='CREDITS'||!allowed(primeIndex,slots[to]))continue;
      if(from>=0&&!allowed(seed[to],slots[from]))continue;
      const candidate=[...seed];
      if(from>=0)candidate[from]=candidate[to];
      candidate[to]=primeIndex;
      if(!seeds.some(s=>s.every((u,i)=>u===candidate[i])))seeds.push(candidate);
    }
  }
  let best=null;
  for(const seed of seeds){const result=climb(seed);if(!best||better(result.value,best.value))best=result;}
  let {assignment}=best;
  function climb(start){
  let assignment=start,value=score(assignment);
  for(let pass=0;pass<40;pass++){
    let next=null,nextValue=value;
    const used=new Set(assignment.filter(i=>i>=0));
    for(let i=0;i<slots.length;i++){
      for(let u=-1;u<units.length;u++){
        if(used.has(u)||u===assignment[i]||!allowed(u,slots[i]))continue;
        const candidate=[...assignment];candidate[i]=u;const v=score(candidate);
        if(better(v,nextValue)){next=candidate;nextValue=v;}
      }
      for(let j=i+1;j<slots.length;j++){
        if(assignment[i]===assignment[j]||!allowed(assignment[j],slots[i])||!allowed(assignment[i],slots[j]))continue;
        const candidate=[...assignment];[candidate[i],candidate[j]]=[candidate[j],candidate[i]];const v=score(candidate);
        if(better(v,nextValue)){next=candidate;nextValue=v;}
        // Moving C-3PO out of support may only pay off when another Protocol
        // immediately takes over his bonus slot. Compare both changes together.
        const vacated=assignment[i]>=0&&units[assignment[i]].name==='C-3PO'&&assignment[j]<0?i:assignment[j]>=0&&units[assignment[j]].name==='C-3PO'&&assignment[i]<0?j:-1;
        if(vacated>=0&&isProtocolStation(slots[vacated].station))for(let u=0;u<units.length;u++){
          if(used.has(u)||!allowed(u,slots[vacated]))continue;
          const filled=[...candidate];filled[vacated]=u;const value=score(filled);
          if(better(value,nextValue)){next=filled;nextValue=value;}
        }
      }
    }
    if(!next)break;assignment=next;value=nextValue;
  }
  return {assignment,value};
  }
  // A Protocol droid can only ever stand in a Protocol slot, so one the search
  // left out is not spare while a Protocol slot is still empty. It takes the
  // free slot where it helps most (its own room first on a tie, which is also
  // where Work sends it) instead of ending up on the Sell list.
  if(state.optimiseKeepProtocol!==false){
    const regionNow=new Map(p.placed.filter(x=>isProtocolStation(x.station)).map(x=>[keyOf(x),PROTOCOL_SLOTS[x.station].region]));
    for(let guard=0;guard<slots.length;guard++){
      const used=new Set(assignment.filter(i=>i>=0));let pick=null;
      for(let i=0;i<slots.length;i++){
        if(assignment[i]>=0||!isProtocolStation(slots[i].station))continue;
        for(let u=0;u<units.length;u++){
          if(used.has(u)||units[u].droid?.type!=='PROTOCOL'||!allowed(u,slots[i]))continue;
          const candidate=[...assignment];candidate[i]=u;
          const value=score(candidate),home=regionNow.get(units[u].key)===PROTOCOL_SLOTS[slots[i].station].region;
          if(!pick||better(value,pick.value)||!better(pick.value,value)&&home&&!pick.home)pick={candidate,value,home};
        }
      }
      if(!pick)break;assignment=pick.candidate;
    }
  }
  // With more Protocol droids than slots, the ones left over are the ones that
  // get sold, so they must be the weakest. The move threshold alone would keep a
  // weak droid in its slot and sell a stronger one standing elsewhere, because a
  // better Crafting bonus earns no credits to pay for the walk. A leftover that
  // is being saved on purpose (a fusion rule, or Keep pressed in the plan) stays out.
  {
    const strength=index=>protocolBonus(units[index].droid,units[index].variant,'CREDITS')*1e6+protocolBonus(units[index].droid,units[index].variant,'CRAFTING');
    const saved=new Set(sparedFromSelling());
    for(let guard=0;guard<units.length;guard++){
      const used=new Set(assignment.filter(i=>i>=0));
      const spare=units.map((_,u)=>u).filter(u=>!used.has(u)&&units[u].droid?.type==='PROTOCOL'&&!saved.has(units[u].key)&&!keepForFusion(units[u])).sort((a,b)=>strength(b)-strength(a))[0];
      if(spare===undefined)break;
      const weakest=slots.map((_,i)=>i).filter(i=>assignment[i]>=0&&isProtocolStation(slots[i].station)&&allowed(spare,slots[i])).sort((a,b)=>strength(assignment[a])-strength(assignment[b]))[0];
      if(weakest===undefined||strength(assignment[weakest])>=strength(spare))break;
      assignment=[...assignment];assignment[weakest]=spare;
    }
  }
  const assignments=assignment.flatMap((index,i)=>index<0?[]:[{key:units[index].key,name:units[index].name,variant:units[index].variant,...slots[i]}]);
  const income=incomeForPlaced(layout(assignment));
  return {income,gain:income-currentIncome,assignments:stabiliseAssignments(assignments,p),moves:[],protocolPriority:state.protocolPriority||'credits'};
}
// The game's Work command only sends a droid to another type of room once its
// own room is full, and only lands on the Upgrade Chip when every room is. A
// layout that breaks either rule cannot be walked, whatever it would earn, so
// any such droid goes back to its own room and the empty slots there are filled.
function repairReachableLayout(result,p){
  const keyOf=x=>`${x.source}:${x.unit}`,locked=p.placed.filter(x=>x.lockedSlot||isBuilding(x));
  const typeOf=x=>state.droids.find(d=>d.name===x.name)?.type;
  const assignments=result.assignments.map(x=>({...x}));
  for(let guard=0;guard<6;guard++){
    let changed=false;
    for(const type of PRODUCTIVE_STATIONS){
      const capacity=stationSlotIndices(type).length,inRoom=()=>assignments.filter(x=>x.station===type).length+locked.filter(x=>x.station===type).length;
      const stray=assignments.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)&&x.station!==type&&typeOf(x)===type);
      if(!stray.length||inRoom()>=capacity)continue;
      // Bring the least valuable stray home while its room still has space.
      const value=x=>state.droids.find(d=>d.name===x.name)?.variants?.[x.variant]?.income||0;
      stray.sort((a,b)=>value(a)-value(b));
      for(const unit of stray){if(inRoom()>=capacity)break;unit.station=type;unit.slot=-1;changed=true;}
    }
    if(!changed)break;
  }
  // Refill the slots that left behind with droids nobody placed: each one's own
  // room first, another room only once its own is full. These vacancies already
  // need filling, so compare real income rather than charging optional moves.
  const owned=expandedOwned(),unitOf=key=>owned.find(u=>keyOf(u)===key);
  const layoutOf=list=>[...locked,...list.map(x=>({...unitOf(x.key),...x}))];
  const lockedKeys=new Set(locked.map(keyOf));
  const roomLeft=type=>stationSlotIndices(type).length-assignments.filter(x=>x.station===type).length-locked.filter(x=>x.station===type).length;
  let added=0;
  for(let guard=0;guard<owned.length;guard++){
    const taken=new Set(assignments.map(x=>x.key)),before=incomeForPlaced(layoutOf(assignments));let pick=null;
    for(const unit of owned){
      const key=keyOf(unit),d=state.droids.find(x=>x.name===unit.name);
      if(taken.has(key)||lockedKeys.has(key)||!PRODUCTIVE_STATIONS.includes(d?.type))continue;
      for(const station of PRODUCTIVE_STATIONS){
        if(roomLeft(station)<=0||station!==d.type&&roomLeft(d.type)>0||!canUseStation(d,station))continue;
        const entry={key,name:unit.name,variant:unit.variant,station,slot:-1},gain=incomeForPlaced(layoutOf([...assignments,entry]))-before;
        if(gain>1e-7&&(!pick||gain>pick.gain))pick={entry,gain};
      }
    }
    if(!pick)break;assignments.push(pick.entry);added++;
  }
  // The search can also fill a newly vacated slot with a weak idle copy to
  // avoid the move penalty on a stronger displaced earner. Both need moving:
  // do not sell or park the stronger copy just to save that notional penalty.
  // Only reconsider new occupants; established work positions keep the user's
  // move threshold. Locked, building and reserved units remain excluded.
  const originalSlots=new Map(p.placed.map(u=>[`${u.station}:${u.slot}`,keyOf(u)]));
  for(let guard=0;guard<owned.length;guard++){
    const taken=new Set(assignments.map(x=>x.key)),before=incomeForPlaced(layoutOf(assignments));let pick=null;
    for(let i=0;i<assignments.length;i++){
      const target=assignments[i];
      if(!PRODUCTIVE_STATIONS.includes(target.station)||originalSlots.get(`${target.station}:${target.slot}`)===target.key)continue;
      for(const unit of owned){
        const key=keyOf(unit),d=state.droids.find(x=>x.name===unit.name);
        if(taken.has(key)||lockedKeys.has(key)||!PRODUCTIVE_STATIONS.includes(d?.type)||!canUseStation(d,target.station)||target.station!==d.type&&roomLeft(d.type)>0)continue;
        const entry={key,name:unit.name,variant:unit.variant,station:target.station,slot:target.slot};
        const candidate=assignments.map((x,j)=>j===i?entry:x),gain=incomeForPlaced(layoutOf(candidate))-before;
        if(gain>1e-7&&(!pick||gain>pick.gain))pick={i,entry,gain};
      }
    }
    if(!pick)break;assignments[pick.i]=pick.entry;added++;
  }
  const stationChanged=added||assignments.some((x,i)=>x.station!==result.assignments[i].station);
  if(!stationChanged)return result;
  const stabilised=stabiliseAssignments(assignments.map(x=>({...x,slot:x.slot<0?0:x.slot})),p);
  const placed=[...locked,...stabilised.map(x=>({...unitOf(x.key),...x}))];
  return {...result,assignments:stabilised,income:incomeForPlaced(placed),gain:incomeForPlaced(placed)-(result.income-result.gain)};
}

const SLOT_RULES={...Object.fromEntries(Object.entries(PROTOCOL_SLOTS).map(([station,slot])=>[station,{initial:0,unlocks:[slot.unlockRebirth],costs:[slot.costCredits]}])),FUSION:{initial:0,unlocks:Array(3).fill(FUSION_REBIRTH)},FUSION_BUILD:{initial:0,unlocks:[FUSION_REBIRTH,99,99]},WORKER:{initial:4,unlocks:[1,4,7,10,12,14,16]},ASTROMECH:{initial:3,unlocks:[2,5,8,11,13,15]},BATTLE:{initial:2,unlocks:[3,6,9,17,18,19,20,21,22]},BUILD:{initial:1,unlocks:[1,2]},LOUNGE:{initial:5,unlocks:Array(16).fill(99)},COMPANION:{initial:2,unlocks:[]},UPGRADE_CHIP:{initial:1,unlocks:[]}};
// Astromech slots 1, 3, 5, 7 and 9 send droids on missions; the rest just earn.
// Mission slots are numbered as the Base shows them, so these are the indices.
const ASTROMECH_MISSION_SLOTS=[0,2,4,6,8];
// How the game picks a slot for you. It takes the free slot closest to where the
// droid was standing, so a station has no fill order of its own: refill the same
// station from two directions and you get near-opposite answers. The Lounge was
// swept twice to check. From Worker slots it filled 1,2,3,5,4,6,10,7,9,8; from
// Battle slots 10,9,8,7,6,4,1,5,2,3 — because Worker sits south of the Lounge and
// Battle north of it. Distance from the origin reproduces both, down to which half
// of the Lounge goes first. No single list can say that.
//
// Two things distance does not decide.
//
// Astromech puts its five mission slots — 1, 3, 5, 7 and 9 — ahead of every
// earning-only slot, from any origin. Mission slots were taken from both halves of
// the Lounge and every even slot came later regardless, so the first five
// Astromechs you send to work are the ones that go on missions.
//
// Recovered 3D attachment positions now take precedence, including Battle's
// upper floor. The measured sweep below remains a fallback only when the
// source position is unknown; it is not a universal distance order.
//
//   Battle  11, 10, 5, 4, 9, 3, 8, 2, 7, 6, 1
//
// It does contradict an earlier pair test where Battle 1 and 6 were free and the
// droid took 1. No single list can explain both, and the origin is why — that pair
// test started somewhere else. Left standing rather than papered over.
//
// Companion needs no entry despite having no dots: nothing on the map is a distance
// from a slot that sits on you, so every gap comes back the same and the stable
// sort leaves slot order alone.
const MEASURED_FILL_ORDER={BATTLE:[10,9,4,3,8,2,7,1,6,5,0]};
// Allocation order uses 3D positions when both ends are known. With no origin,
// allocation needs a provisional order; the route predictor separately marks
// unknown origins and ties as conditional rather than claiming that order.
const slotFillOrder=(station,origin)=>{
  const available=stationSlotIndices(station),measured=MEASURED_FILL_ORDER[station];
  const distances=origin?available.map(slot=>({slot,gap:slotDistanceSquared(origin,{station,slot})})):[];
  const hasGeometry=distances.length>0&&distances.every(x=>Number.isFinite(x.gap));
  const ordered=hasGeometry
    ?distances.sort((a,b)=>a.gap-b.gap).map(x=>x.slot)
    :measured
    ?[...measured.filter(slot=>available.includes(slot)),...available.filter(slot=>!measured.includes(slot))]
    :origin
      ?available.map(slot=>({slot,gap:slotWalkGap(origin,{station,slot})})).sort((a,b)=>a.gap-b.gap).map(x=>x.slot)
      :available;
  if(station!=='ASTROMECH')return ordered;
  const mission=ordered.filter(slot=>ASTROMECH_MISSION_SLOTS.includes(slot));
  return[...mission,...ordered.filter(slot=>!ASTROMECH_MISSION_SLOTS.includes(slot))];
};
const TYPE_IMAGES={PROTOCOL:'assets/types/Protocol.svg',WORKER:'assets/types/Worker_Droid_-_Droid_-_Droid_Tycoon.png',ASTROMECH:'assets/types/Astromech_Droid_-_Droid_-_Droid_Tycoon.png',BATTLE:'assets/types/Battle_Droid_-_Droid_-_Droid_Tycoon.png'};
const novaLevelFor=id=>Math.max(0,Number(state.novaUpgrades?.[id]||0));
const stationName=type=>PROTOCOL_SLOTS[type]?.label||({PROTOCOL:'Protocol',FUSION:'Fusion',FUSION_BUILD:'Fusion Build',WORKER:'Worker',ASTROMECH:'Astromech',BATTLE:'Battle',BUILD:'Build',LOUNGE:'Lounge',COMPANION:'Companion',UPGRADE_CHIP:'Upgrade Chip',BLUEPRINT_STORAGE:'Blueprint Storage'}[type]||type);
const stationIcon=type=>isProtocolStation(type)?'<img src="assets/types/Protocol.svg" alt="">':TYPE_IMAGES[type]?`<img src="${TYPE_IMAGES[type]}" alt="">`:type==='UPGRADE_CHIP'?'<img src="assets/other/UpgradeChip.png" alt="">':type==='BUILD'?'⚒':type==='LOUNGE'?'◔':type==='BLUEPRINT_STORAGE'?'▣':'♟';
const loungeNovaSlots=()=>Math.max(novaLevelFor('lounge-slot'),state.loungePurchased||0);
const blueprintStorageSlots=()=>novaLevelFor('blueprint-storage');
const loungeSlotMeta=index=>index<5?{kind:'base',label:'Lounge slot'}:index<9?{kind:'rebirth',rebirth:index+12,label:`Unlocks at Rebirth ${index+12}`}:{kind:'nova',level:index-8,label:`Nova Shop Lounge Slot ${index-8}`};
const loungeSlotLabel=index=>loungeSlotMeta(index).label;
const lockedSlotLabel=(type,index)=>type==='FUSION_BUILD'&&fusionBuildTank(index)?`Needs Fusion Tank level ${fusionBuildTank(index)} — Nova Shop or Cantina`:type==='FUSION'||type==='FUSION_BUILD'?`Unlocks at Rebirth ${FUSION_REBIRTH}`:type==='COMPANION'&&index===1?'Unlock Second Companion in Nova Shop':type==='UPGRADE_CHIP'?'Unlock Upgrade Chip Station in Nova Shop':type==='LOUNGE'?loungeSlotLabel(index):`Unlocks at Rebirth ${slotUnlockRebirth(type,index)}`;
const loungeDivider=index=>index===5?'<div class="upper-level-divider"><span>Rebirth Unlocks</span></div>':index===9?'<div class="upper-level-divider"><span>Nova Shop</span></div>':index===16?'<div class="upper-level-divider"><span>Upstairs Lounge (Nova Shop)</span></div>':'';
// The Firing Range gained a second floor with the Rebirth 17-22 Battle slots.
// Battle is the only station split over two floors, so a slot number on its own
// does not tell you which one to walk to. Everything that names a Battle slot
// says the floor as well.
const BATTLE_UPSTAIRS_FROM=5;
// The eleven Worker slots stand in two places: eight on the round worker
// platform and, from the ninth unlocked onwards, three outside the main one.
const WORKER_MAIN_PLATFORM_FROM=8;
const slotFloor=(station,index)=>station==='BATTLE'?(index>=BATTLE_UPSTAIRS_FROM?'upstairs':'downstairs'):station==='LOUNGE'?(index>=16?'upstairs':'downstairs'):'';
const floorNote=(station,index)=>{const floor=slotFloor(station,index);return floor?` (${floor})`:''};
const stationSlotLabel=(station,index)=>`${stationName(station)} ${index+1}${floorNote(station,index)}`;
const slotDivider=(type,index)=>type==='LOUNGE'?loungeDivider(index):type==='BATTLE'&&index===BATTLE_UPSTAIRS_FROM?'<div class="upper-level-divider"><span>Second Floor</span></div>':type==='WORKER'&&index===WORKER_MAIN_PLATFORM_FROM?'<div class="upper-level-divider"><span>Outside Main Platform</span></div>':'';
const slotPurchaseKey=(type,index)=>`${type}:${index}`;
function slotPriceLabel(type,index){
  let upgrade=null,level=1;
  if(type==='FUSION_BUILD'&&index>0){upgrade='fusion-tank';level=index;}
  else if(type==='LOUNGE'&&loungeSlotMeta(index).kind==='nova'){upgrade='lounge-slot';level=loungeSlotMeta(index).level;}
  else if(type==='COMPANION'&&index===1)upgrade='companion-slot';
  else if(type==='UPGRADE_CHIP')upgrade='upgrade-chip-station';
  else if(type==='BLUEPRINT_STORAGE'){upgrade='blueprint-storage';level=index+1;}
  if(upgrade){const row=novaUpgrade(upgrade)?.levels?.[level-1];return row?`${Number(row.cost).toLocaleString('en-GB')} Nova Crystals (level ${level})`:'';}
  if(type==='FUSION'||type==='FUSION_BUILD')return `${fmt(state.progression?.fusionRoomCredits||400000)} credits for the Fusion room`;
  const cost=state.progression?.slotCreditCosts?.[slotPurchaseKey(type,index)];return cost==null?'':`${fmt(cost)} credits`;
}

function slotUnlockRebirth(type,index){if(type==='LOUNGE'){const meta=loungeSlotMeta(index);return meta.kind==='rebirth'?meta.rebirth:null}
  // A Fusion Build slot that a tank opens is not waiting on a rebirth at all,
  // and it does not want buying twice: the tank was the purchase, whether it
  // came from the Nova Shop, a pack or V-Bucks. Returning null says both — no
  // rebirth to name, and nothing left to buy.
  if(type==='FUSION_BUILD'&&fusionBuildTank(index))return null;
  const rule=SLOT_RULES[type];return rule&&index>=rule.initial?rule.unlocks[index-rule.initial]??null:null}
// Fusion Tank is one upgrade with two levels, not two upgrades: level 1 opens
// the second Fusion Build slot and level 2 the third. The first comes with the
// room. Returns the tank level a slot needs, or 0 if it needs none.
const fusionBuildTank=index=>index;
function isSlotEligible(type,index,rebirth=state.rebirth){if(type==='FUSION'||type==='FUSION_BUILD'){
    // Nothing in the Fusion room exists before the room does.
    if(rebirth<FUSION_REBIRTH)return false;
    if(type==='FUSION')return index<3;
    const tank=fusionBuildTank(index);
    return index<FUSION_BUILD_SLOTS&&(!tank||novaLevelFor('fusion-tank')>=tank);
  }
  if(type==='LOUNGE'){const meta=loungeSlotMeta(index);return meta.kind==='base'||meta.kind==='rebirth'&&rebirth>=meta.rebirth||meta.kind==='nova'&&loungeNovaSlots()>=meta.level}if(type==='COMPANION')return index===0||index===1&&novaLevelFor('companion-slot')>=1;if(type==='UPGRADE_CHIP')return index===0&&novaLevelFor('upgrade-chip-station')>=1;const rule=SLOT_RULES[type];if(!rule)return false;if(index<rule.initial)return true;const unlock=slotUnlockRebirth(type,index);return unlock!==null&&rebirth>=unlock}
const fusionRoomPurchaseKeys=()=>['FUSION:0','FUSION:1','FUSION:2','FUSION_BUILD:0'];
const isSlotPurchased=(type,index)=>slotUnlockRebirth(type,index)===null||(type==='FUSION'||type==='FUSION_BUILD'&&index===0?fusionRoomPurchaseKeys().some(key=>state.purchasedSlots.includes(key)):state.purchasedSlots.includes(slotPurchaseKey(type,index)));
const isSlotUnlocked=(type,index,rebirth=state.rebirth)=>isSlotEligible(type,index,rebirth)&&isSlotPurchased(type,index);
const stationSlotIndices=(type,rebirth=state.rebirth)=>!SLOT_RULES[type]?[]:Array.from({length:SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length},(_,i)=>i).filter(i=>isSlotUnlocked(type,i,rebirth));
const capacity=(type,rebirth=state.rebirth)=>type==='BLUEPRINT_STORAGE'?blueprintStorageSlots():stationSlotIndices(type,rebirth).length;
function eligibleRebirthSlots(rebirth=state.rebirth){return Object.keys(SLOT_RULES).flatMap(type=>Array.from({length:SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length},(_,index)=>({type,index,unlock:slotUnlockRebirth(type,index)}))).filter(x=>x.unlock!==null&&x.unlock<=rebirth)}
function autoPurchaseEligibleSlots(){if(!state.autoPurchaseSlots)return false;const bought=new Set(state.purchasedSlots),before=bought.size;eligibleRebirthSlots().forEach(x=>bought.add(slotPurchaseKey(x.type,x.index)));state.purchasedSlots=[...bought];return bought.size!==before}
function purchaseRebirthSlot(type,index,onDone){const unlock=slotUnlockRebirth(type,index);if(unlock===null||!isSlotEligible(type,index))return;const room=type==='FUSION'||type==='FUSION_BUILD'&&index===0,keys=room?fusionRoomPurchaseKeys():[slotPurchaseKey(type,index)];state.purchasedSlots=[...new Set([...state.purchasedSlots,...keys])];save();toast(room?'Fusion room purchased — all three input slots and the first build tank are open':`${type[0]+type.slice(1).toLowerCase()} slot purchased`);onDone?.()}
function expandedOwned(){return state.owned.flatMap((x,i)=>Array.from({length:x.qty},(_,unit)=>({...x,source:i,unit}))) }
function placements(){
  const occupied=Object.fromEntries(Object.keys(SLOT_RULES).map(type=>[type,new Set()])),placed=[],overflow=[],pending=[];
  const claim=(x,station,slot)=>{occupied[station].add(slot);placed.push({...x,station,slot})};
  const firstFree=(station,origin)=>slotFillOrder(station,origin).find(i=>!occupied[station].has(i))??-1;
  const standingAt=x=>{const slot=Number(x.preferredSlot);return SLOT_RULES[x.preferred]&&Number.isInteger(slot)?{station:x.preferred,slot}:null};
  for(const x of expandedOwned()){
    const station=x.preferred,slot=Number(x.preferredSlot),d=state.droids.find(d=>d.name===x.name);
    if(station&&SLOT_RULES[station]&&canUseStation(d,station)&&Number.isInteger(slot)&&isSlotUnlocked(station,slot)&&!occupied[station].has(slot))claim(x,station,slot);
    else pending.push(x);
  }
  for(const x of pending){
    const d=state.droids.find(y=>y.name===x.name),from=standingAt(x);
    const work=d?.type==='PROTOCOL'?PRODUCTIVE_STATIONS:[d?.type];
    const choices=[x.preferred,...work,'BUILD'].filter(station=>SLOT_RULES[station]&&canUseStation(d,station));
    let found=false;
    for(const station of new Set(choices)){const slot=firstFree(station,from);if(slot>=0){claim(x,station,slot);found=true;break;}}
    if(!found)overflow.push(x);
  }
  return{placed,overflow};
}
function materializePlacements(p){const rows=[],indices=new Map();for(const x of [...p.placed,...p.overflow]){const index=rows.length,placed=Boolean(x.station);rows.push({name:x.name,variant:x.variant,qty:1,...(placed?{preferred:x.station,preferredSlot:x.slot}:x.preferred?{preferred:x.preferred}:{}),...(x.lockedSlot||x.lockedCompanion?{lockedSlot:true}:{}),...(x.built?{built:true}:{}),...(normaliseTrait(x.trait,state.droids.find(d=>d.name===x.name))?{trait:normaliseTrait(x.trait,state.droids.find(d=>d.name===x.name))}:{})});indices.set(`${x.source}:${x.unit}`,index)}state.owned=rows;return indices}
function movePlacedDroid(p,source,targetStation,targetSlot,target){const indices=materializePlacements(p),sourceRow=state.owned[indices.get(`${source.source}:${source.unit}`)];if(!sourceRow)return;const oldStation=source.station,oldSlot=source.slot;if(!canUseStation(state.droids.find(d=>d.name===source.name),targetStation)||target&&!canUseStation(state.droids.find(d=>d.name===target.name),oldStation)){toast('Protocol bonus slots need a Protocol droid');return}sourceRow.preferred=targetStation;sourceRow.preferredSlot=targetSlot;if(target){const targetRow=state.owned[indices.get(`${target.source}:${target.unit}`)];if(targetRow){targetRow.preferred=oldStation;targetRow.preferredSlot=oldSlot}}save()}
function toggleSlotLock(source,unit){const p=placements(),indices=materializePlacements(p),index=indices.get(`${source}:${unit}`),row=state.owned[index];if(!row)return;row.lockedSlot=!row.lockedSlot;save();toast(row.lockedSlot?'Droid slot locked for Optimise':'Droid slot unlocked')}
function moveUnitByKey(sourceKey,targetKey,onDone){const p=placements(),source=p.placed.find(x=>`${x.source}:${x.unit}`===sourceKey),target=p.placed.find(x=>`${x.source}:${x.unit}`===targetKey);if(!source||!target)return;movePlacedDroid(p,source,target.station,target.slot,target);onDone()}
function moveUnitToSlot(sourceKey,station,slot,onDone){const p=placements(),source=p.placed.find(x=>`${x.source}:${x.unit}`===sourceKey);if(!source)return;movePlacedDroid(p,source,station,slot,p.placed.find(x=>x.station===station&&x.slot===slot));onDone()}
// Dragging once locked the tab up with nothing logged, and the freeze survived a
// page refresh but not a browser restart — the mark of a drag the browser never
// finished, left running with the pointer captured. Re-rendering the Base inside
// the drop handler tore the dragged card out mid-drag and caused exactly that;
// the render is now deferred. Set to false to turn dragging off again if it
// returns — the swap button on each card does the same job.
const DRAG_AND_DROP_ENABLED=true;
// Holding Ctrl (or Cmd) turns a drag into a duplicate. Late-game bases end up
// with the same high earner standing in five slots, and filling those by hand is
// five trips through the picker: click the slot, type the name, pick the droid,
// pick the quality, confirm. Dragging one that is already placed says all of it.
const dragCopyWanted=e=>Boolean(e.ctrlKey||e.metaKey);
function copyPlacedDroid(source,station,slot,occupant){
  const d=state.droids.find(x=>x.name===source.name);if(!d)return false;
  // Copying onto an occupied slot would have to displace it, which is what a
  // plain drag already does. An empty slot is the only unambiguous target.
  if(occupant){toast('Ctrl-drag copies into an empty slot');return false}
  const limit=Number(d.special?.maxQuantity)||0;
  if(limit&&state.owned.filter(x=>x.name===d.name).reduce((sum,x)=>sum+x.qty,0)>=limit){toast(`${d.name} is limited to ${limit} in a base`);return false}
  commitOwned(d.name,source.variant,1,station,slot);
  return true;
}
function attachSlotDragAndDrop(p,rerender){if(!DRAG_AND_DROP_ENABLED)return;let dragged=null;const clear=()=>document.querySelectorAll('.base-slot,.map-pin').forEach(x=>x.classList.remove('drag-source','drag-target','drag-copy'));document.querySelectorAll('.base-slot.occupied[draggable="true"],.map-pin.filled[draggable="true"]').forEach(card=>{card.ondragstart=e=>{dragged=p.placed.find(x=>x.source===Number(card.dataset.source)&&x.unit===Number(card.dataset.unit));if(!dragged){e.preventDefault();return}card.classList.add('drag-source');e.dataTransfer.effectAllowed='copyMove';e.dataTransfer.setData('text/plain',`${dragged.source}:${dragged.unit}`)};card.ondragend=()=>{dragged=null;clear()}});document.querySelectorAll('.base-slot[data-slot-index],.map-pin[data-slot-station]').forEach(target=>{target.ondragover=e=>{if(!dragged||target.disabled)return;e.preventDefault();const copy=dragCopyWanted(e);e.dataTransfer.dropEffect=copy?'copy':'move';target.classList.add('drag-target');target.classList.toggle('drag-copy',copy)};target.ondragleave=()=>target.classList.remove('drag-target','drag-copy');target.ondrop=e=>{e.preventDefault();if(!dragged||target.disabled)return;const station=target.dataset.slotStation||target.dataset.station,index=Number(target.dataset.slotIndex);if(station===dragged.station&&index===dragged.slot){clear();return}const occupant=p.placed.find(x=>x.station===station&&x.slot===index);if(dragCopyWanted(e)){if(!copyPlacedDroid(dragged,station,index,occupant)){dragged=null;clear();return}}else movePlacedDroid(p,dragged,station,index,occupant);dragged=null;clear();
    // Re-render after the drop handler returns, never inside it. Rebuilding the
    // Base tears out the card being dragged, and if that happens before the
    // browser has finished the drag it can leave the drag running with the
    // pointer captured — the page stops responding with nothing in the console.
    setTimeout(rerender,0)}})}
const norm=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
function imageFor(droid,variant='DEFAULT'){
  if(droid.portraits?.[variant])return droid.portraits[variant];
  if(baseVariant(variant)==='KYBER'&&!isIconic(droid))return `assets/droids/kyber/${droid.name.replace(/[^A-Za-z0-9-]/g,'_')}_Kyber.png`;
  if(droid.name==='D-O')return 'assets/droids/D-O.png';
  if(variant==='STELLAR'&&droid.stellarImage)return droid.stellarImage;
  const aliases={'BU-4D':'B-U4D','LO':'L0','MONO-WALKER':'MONO-WLKR','OPTI-STRIKE':'OPTI-STRK','SENATE HOVERCAM':'SENATE HOVERCAM'}; const target=norm(aliases[droid.name]||droid.name);
  const imageVariant=variant,qualityPattern='Gold|Diamond|Rainbow|Beskar|Galactic|Stellar';
  const entries=Object.entries(state.images).filter(([k])=>norm(k.split(' - Droid')[0].replace(new RegExp(`\\(${qualityPattern}\\)`,'i'),''))===target);
  let match=entries.find(([k])=>imageVariant==='DEFAULT'?!new RegExp(`\\(${qualityPattern}\\)`,'i').test(k):new RegExp(`\\(${imageVariant}\\)`,'i').test(k));
  match ||= entries.find(([k])=>!new RegExp(`\\(${qualityPattern}\\)`,'i').test(k)) || entries[0]; return match?.[1]||'';
}
function picture(droid,variant='DEFAULT'){const src=imageFor(droid,variant),fallback=imageFor(droid,'DEFAULT');return src?`<img src="${escapeAttr(src)}" alt="${escapeAttr(droid.name)} ${variant.toLowerCase()} variant" data-portrait-fallback="${escapeAttr(fallback)}" loading="lazy">`:`<span class="fallback">${droid.name.slice(0,3)}</span>`}
// Retry a failed portrait once without the cached response, then use its default
// portrait. A failed fallback ends in a readable label, never a retry loop.
document.addEventListener('error',event=>{
  const img=event.target;if(!(img instanceof HTMLImageElement)||!img.hasAttribute('data-portrait-fallback'))return;
  const attempt=Number(img.dataset.portraitAttempt||0);img.dataset.portraitAttempt=String(attempt+1);
  if(attempt===0){const url=new URL(img.src,document.baseURI);url.searchParams.set('portraitRetry',Date.now());img.src=url.href;return;}
  const fallback=img.dataset.portraitFallback;
  if(attempt===1&&fallback&&new URL(fallback,document.baseURI).pathname!==new URL(img.src,document.baseURI).pathname){delete img.dataset.kyberColour;img.src=fallback;return;}
  const label=document.createElement('span');label.className='fallback';label.textContent=img.alt;img.replaceWith(label);
},true);

function card(d){if(d.comingSoon)return comingSoonCard(d,variantText);return `<a class="droid-card ${d.rarity.toLowerCase()}" href="#/droid/${slug(d.name)}"><div class="droid-image">${picture(d)}</div><div class="card-body">${rarityBadge(d.rarity)}<h3>${d.name}</h3><div class="card-meta"><span>${d.type}</span><span class="card-income">${isIconic(d)?`${iconicIncome(d)*100}%/s`:`${fmt(d.variants.DEFAULT.income)}/s`}</span></div></div></a>`}
const patchNotesSeenKey='droid-archive-seen-patch-notes';
const patchTodoTasks=()=>state.patchNotes.filter(x=>x.todo).map(x=>({id:x.todo.id||x.id,text:x.todo.text||x.title,done:x.todo.done??true,patchNote:true,date:x.date}));
function seenPatchNoteIds(){try{return JSON.parse(localStorage.getItem(patchNotesSeenKey)||'[]')}catch{return[]}}
function markPatchNotesSeen(notes){const seen=new Set(seenPatchNoteIds());notes.forEach(note=>seen.add(note.id));localStorage.setItem(patchNotesSeenKey,JSON.stringify([...seen]))}
function showPatchNotesOnce(){if(location.hash.startsWith('#/shared')||document.querySelector('#modalRoot')?.children.length)return;if(new URLSearchParams(location.search).get('companion')==='1'||patchNotesPrompted||!state.patchNotes.length)return;const seen=new Set(seenPatchNoteIds()),notes=state.patchNotes.filter(note=>note.showOnStartup!==false&&!seen.has(note.id));if(!notes.length)return;patchNotesPrompted=true;const root=document.querySelector('#modalRoot');root.innerHTML=`<div class="modal-backdrop patch-notes-backdrop"><section class="modal patch-notes-modal" role="dialog" aria-modal="true" aria-labelledby="patchNotesTitle"><p class="eyebrow">Droid Archives update</p><h2 id="patchNotesTitle">What's new?</h2><div class="patch-notes-list">${notes.map(note=>`<article><header><strong>${note.title}</strong>${note.date?`<time>${note.date}</time>`:''}</header>${note.summary?`<p>${note.summary}</p>`:''}${Array.isArray(note.changes)&&note.changes.length?`<ul>${note.changes.map(change=>`<li>${change}</li>`).join('')}</ul>`:''}</article>`).join('')}</div><div class="modal-actions"><button class="btn" id="patchNotesClose">Got it</button><a class="btn secondary" href="#/todo" id="patchNotesTodo">View To Do List</a></div></section></div>`;const close=()=>{markPatchNotesSeen(notes);root.innerHTML=''};root.querySelectorAll('a[href="#/kyber"]').forEach(link=>link.onclick=close);root.querySelector('#patchNotesClose').onclick=close;root.querySelector('#patchNotesTodo').onclick=close}
function droidexEntry(name,variant){return state.droidex.find(x=>x.name===name&&x.variant===variant)}
function toggleDroidex(name,variant){if(isComingSoonDroid(name)){toast('This droid is coming soon');return}const index=state.droidex.findIndex(x=>x.name===name&&x.variant===variant);index>=0?state.droidex.splice(index,1):state.droidex.push({name,variant,flawless:isDroidFlawless(name)});save()}
// Owning a droid records it in the Droidex. Recorded without saving so callers
// can batch a whole upgrade path into one write.
function recordDroidex(name,variant){if(variant.startsWith('KYBER_'))recordDroidex(name,'KYBER');if(!state.droids.some(d=>d.name===name))return false;if(droidexEntry(name,variant))return false;state.droidex.push({name,variant,flawless:isDroidFlawless(name)});return true}
// Upgrading passes through every quality on the way, and each one counts, so
// Standard to Beskar records Gold, Diamond and Rainbow as well. Downgrades
// record nothing: you never held the qualities you skipped back past.
function recordDroidexUpgrade(name,from,to){const start=variantRank(from),end=variantRank(to);let added=0;if(end>start)for(const variant of VARIANTS.slice(start+1,end+1))if(recordDroidex(name,variant))added++;if(to.startsWith('KYBER_')&&recordDroidex(name,to))added++;return added}
// Build slots hold droids that are still being built. They cannot be moved and
// do not count for the Droidex until finished, so absence of the flag means
// unfinished — that way anything already sitting in Build reads as unfinished
// rather than being silently treated as done.
// A Fusion Build slot works like a Build slot: something sits in it unfinished
// until you mark it done, and while it does it must not be moved or sold.
const BUILDING_STATIONS=['BUILD','FUSION_BUILD'];
const isBuilding=x=>BUILDING_STATIONS.includes(x?.station)&&!x.built;
const rowIsBuilding=row=>row?.preferred==='BUILD'&&!row.built;
const autoCompleteBuilds=()=>Boolean(state.autoCompleteBuilds);
function toggleFlawless(name,variant){const d=state.droids.find(x=>x.name===name);if(onlyDefaultVariant(d)||!droidexEntry(name,variant))return;const flawless=!isDroidFlawless(name);state.droidex.filter(x=>x.name===name).forEach(x=>x.flawless=flawless);save()}
// The Droidex and flawless buttons join the row the page already rendered, so
// every action on a droid page sits in one flex line instead of being loose
// siblings glued together with stray text nodes. Presence of #toggleDex, not of
// the row itself, is what says these have already been added.
function addDetailDroidexControls(){if(!location.hash.startsWith('#/droid/')||document.querySelector('#toggleDex'))return;const add=document.querySelector('#addThis');if(!add)return;const row=add.parentElement,d=state.droids.find(x=>slug(x.name)===location.hash.split('/')[2]);const active=document.querySelector('.variant-tabs button.active');if(!d)return;const variant=isIconic(d)?'DEFAULT':active?.dataset.v||'DEFAULT',entry=droidexEntry(d.name,variant),flawless=isDroidFlawless(d.name);const redraw=()=>{row.querySelectorAll('#toggleDex,#toggleFlawless').forEach(node=>node.remove());addDetailDroidexControls()};row.insertAdjacentHTML('beforeend',`<button class="btn secondary" id="toggleDex">${entry?'Remove from':'Add to'} Droidex</button>${isIconic(d)?'':`<button class="flawless-toggle ${flawless?'active':''}" id="toggleFlawless" ${entry?'':'disabled'}>✦ ${flawless?'Flawless':'Mark flawless'}</button>`}`);document.querySelector('#toggleDex').onclick=()=>{toggleDroidex(d.name,variant);toast(entry?'Removed from Droidex':'Added to Droidex');redraw()};const flawlessButton=document.querySelector('#toggleFlawless');if(flawlessButton)flawlessButton.onclick=()=>{toggleFlawless(d.name,variant);redraw()}}
// Profile-scoped recommendations. Nova Shop purchases remain the single source
// of notification capacity; changing a priority never grants extra game slots.
function normaliseNotificationPreferences(value){
  const tracked=[],seen=new Set();
  for(const row of Array.isArray(value?.tracked)?value.tracked:[]){
    if(!row||typeof row.name!=='string'||!row.name.trim()||seen.has(row.name))continue;
    seen.add(row.name);tracked.push({name:row.name,variant:OWNED_VARIANTS.includes(row.variant)?row.variant:null});if(tracked.length===10)break;
  }
  return {priority:['next','rare','furthest'].includes(value?.priority)?value.priority:'next',
    horizon:Math.max(1,Math.min(40,Math.floor(Number(value?.horizon)||3))),startRebirth:Math.max(1,Math.min(40,Math.floor(Number(value?.startRebirth)||1))),cycles:['both','next'].includes(value?.cycles)?value.cycles:'current',ownedPolicy:value?.ownedPolicy==='upgrades'?'upgrades':'missing',upgradeTarget:value?.upgradeTarget==='next'?'next':'required',
    upgradeChipLimit:value?.upgradeChipLimit===''||value?.upgradeChipLimit==null||!(Number(value.upgradeChipLimit)>=0)?null:Math.floor(Number(value.upgradeChipLimit)),rangeFromTop:Boolean(value?.rangeFromTop),tracked};
}
// "Default and above" can instead read down from the top variant: "Stellar and below".
function notificationRangeText(variant,settings){
  const top=VARIANTS.at(-1);
  if(!settings.rangeFromTop)return `${variantText(variant)} and above`;
  return variant===top?`${variantText(top)} only`:variant==='DEFAULT'?`${variantText(top)} and below`:`${variantText(variant)} to ${variantText(top)}`;
}
function normaliseFusionPreferences(value){
  return {goal:['balanced','rarity','variant'].includes(value?.goal)?value.goal:'balanced',
    mythics:['variant','reroll','off'].includes(value?.mythics)?value.mythics:'variant',recipes:value?.recipes!==false};
}
function notificationCyclePlan(settings){
  const cycle=Number(state.cycle)||0,keys=Object.keys(state.rebirths).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),index=keys.indexOf(cycle);
  const nextCycle=index>=0&&keys.length>1?keys[(index+1)%keys.length]:null;
  const currentStart=Math.max(settings.startRebirth,Number(state.rebirth)+1),nextStart=settings.startRebirth,goal=rebirthGoal();
  const inRange=(at,start)=>at>=start&&at<=goal&&(settings.priority!=='next'||at<start+settings.horizon);
  const requirements=settings.cycles==='next'?[]:futureRequirements().filter(req=>inRange(req.at,currentStart)).map(req=>({...req,cycle,nextCycle:false}));
  if(settings.cycles!=='current'&&nextCycle!==null){
    requirements.push(...(state.rebirths[nextCycle]||[]).filter(row=>inRange(row.to,nextStart)).flatMap(row=>(row.requiredDroids||[]).map(req=>({...req,at:row.to,cycle:nextCycle,nextCycle:true}))));
  }
  return {requirements,nextCycle,currentStart,nextStart};
}
function notificationRecommendations(){
  const settings=normaliseNotificationPreferences(state.notificationPreferences);
  const slots=Math.max(0,Math.min(10,Math.floor(Number(state.novaUpgrades?.['droidex-notifications'])||0)));
  const variantWatch=Number(state.novaUpgrades?.['variant-watch'])>0;
  const rebirthAlert=Number(state.novaUpgrades?.['rebirth-droid-alert'])>0;
  const alertRebirth=Number(state.rebirth)+1;
  // The automatic alert covers these names now, including copies useful later.
  // Read the actual next rebirth, independently of notification range settings.
  const alertNames=new Set(rebirthAlert?(state.rebirths[state.cycle]||[]).find(row=>row.to===alertRebirth)?.requiredDroids?.map(req=>req.droidName)||[]:[]);
  const manual=Boolean(state.rebirthTracker?.notUsingBase),byName=new Map(),coveredNames=new Set(),upgrades=new Map(),cyclePlan=notificationCyclePlan(settings);
  for(const req of cyclePlan.requirements){
    if(alertNames.has(req.droidName))continue;
    const d=state.droids.find(d=>d.name===req.droidName);
    if(!d||isIconic(d)||isFusion(d))continue;
    // Include an unfinished build as owned: it needs finishing, not another spawn.
    const held=state.owned.filter(row=>row.name===d.name).map(row=>row.variant);
    if(manual&&!req.nextCycle)held.push(rebirthTrackerStatus(req.at,req).selected);
    const have=held.filter(v=>OWNED_VARIANTS.includes(v)).reduce((best,v)=>!best||variantStep(v)>variantStep(best)?v:best,null);
    // Current inventory and manual readiness are not a stash held by another player.
    // An owned copy that is cheap enough to upgrade does not need another spawn.
    const upgradeChips=!req.nextCycle&&have&&settings.upgradeChipLimit!==null&&variantStep(have)<variantStep(req.variant)&&!(manual&&rebirthTrackerStatus(req.at,req).ready)?chipsToVariant(d,have,req.variant):null;
    if(upgradeChips!==null&&upgradeChips<=settings.upgradeChipLimit){
      const row=upgrades.get(d.name);
      if(!row||variantStep(req.variant)>variantStep(row.variant))upgrades.set(d.name,{name:d.name,have,variant:req.variant,chips:upgradeChips,at:Math.min(row?.at??req.at,req.at)});
      else row.at=Math.min(row.at,req.at);
      coveredNames.add(d.name);continue;
    }
    if(!req.nextCycle&&((manual&&rebirthTrackerStatus(req.at,req).ready)||
      (have&&variantStep(have)>=variantStep(req.variant))||(have&&(!variantWatch||settings.ownedPolicy!=='upgrades')))){coveredNames.add(d.name);continue}
    const entry=byName.get(d.name)||{name:d.name,rarity:d.rarity,needs:[],have};
    entry.needs.push({at:req.at,variant:req.variant,cycle:req.cycle,nextCycle:req.nextCycle});byName.set(d.name,entry);
  }
  const candidates=[...byName.values()].map(entry=>{
    entry.needs.sort((a,b)=>Number(a.nextCycle)-Number(b.nextCycle)||a.at-b.at);
    // A slot targets one droid. Nearby planning asks for its earliest unmet
    // quality; long-term planning asks for the strongest quality still needed.
    const target=settings.priority==='next'?entry.needs[0]:entry.needs.reduce((a,b)=>variantStep(b.variant)>variantStep(a.variant)?b:a);
    const anyImprovement=!target.nextCycle&&variantWatch&&settings.ownedPolicy==='upgrades'&&settings.upgradeTarget==='next';
    const variant=anyImprovement?(entry.have?VARIANTS[variantStep(entry.have)+1]:'DEFAULT'):target.variant;
    return {...entry,variant,requiredVariant:target.variant,at:target.at,nextCycleOnly:entry.needs.every(n=>n.nextCycle),nextAt:entry.needs[0].at,lastAt:entry.needs.at(-1).at};
  });
  candidates.sort((a,b)=>Number(a.nextCycleOnly)-Number(b.nextCycleOnly)||(settings.priority==='rare'
    ?rarityStep(b.rarity)-rarityStep(a.rarity)||b.lastAt-a.lastAt||variantStep(b.requiredVariant)-variantStep(a.requiredVariant)||a.name.localeCompare(b.name)
    :settings.priority==='furthest'?b.lastAt-a.lastAt||rarityStep(b.rarity)-rarityStep(a.rarity)||a.name.localeCompare(b.name)
    :a.nextAt-b.nextAt||rarityStep(b.rarity)-rarityStep(a.rarity)||variantStep(b.requiredVariant)-variantStep(a.requiredVariant)||a.name.localeCompare(b.name)));
  const tracked=settings.tracked,trackedNames=new Set(tracked.map(row=>row.name)),availableSlots=Math.max(0,slots-tracked.length);
  const remaining=candidates.filter(row=>!trackedNames.has(row.name));
  const redundantTracked=tracked.filter(row=>alertNames.has(row.name));
  // Owning a droid only covers the current cycle; a Super Rebirth wipes the Base.
  const eligibleNames=new Set(candidates.map(row=>row.name));
  const ownedTracked=tracked.filter(row=>!alertNames.has(row.name)&&coveredNames.has(row.name)&&!eligibleNames.has(row.name));
  // No need left inside these settings, e.g. every rebirth that wanted it is done.
  // Only droids a completed rebirth this cycle asked for and no later rebirth
  // wants: one tracked by hand, or needed beyond the chosen range, is left alone.
  const cycleNeeds=(state.rebirths[state.cycle]||[]).flatMap(row=>(row.requiredDroids||[]).map(req=>({name:req.droidName,at:Number(row.to)})));
  const finished=name=>cycleNeeds.some(need=>need.name===name&&need.at<=Number(state.rebirth))&&!cycleNeeds.some(need=>need.name===name&&need.at>Number(state.rebirth));
  const staleTracked=tracked.filter(row=>finished(row.name)&&!alertNames.has(row.name)&&!coveredNames.has(row.name)&&!eligibleNames.has(row.name));
  // Current-cycle needs outrank next-cycle preparation: droids still waiting for a
  // slot this cycle displace next-cycle-only notifications, lowest priority first.
  const freed=redundantTracked.length+ownedTracked.length+staleTracked.length;
  const waitingCurrent=Math.max(0,remaining.filter(row=>!row.nextCycleOnly).length-availableSlots-freed);
  const deferredTracked=candidates.filter(row=>row.nextCycleOnly&&trackedNames.has(row.name)).reverse().slice(0,waitingCurrent).map(row=>tracked.find(t=>t.name===row.name));
  const removableTracked=[...redundantTracked,...ownedTracked,...staleTracked,...deferredTracked];
  // The droids that would take over once the removable notifications are unmarked.
  const replacements=remaining.slice(availableSlots,availableSlots+removableTracked.length);
  return {settings,slots,variantWatch,rebirthAlert,alertRebirth,redundantTracked,ownedTracked,staleTracked,deferredTracked,removableTracked,replacements,upgrades:[...upgrades.values()].sort((a,b)=>a.at-b.at||a.name.localeCompare(b.name)),cyclePlan,candidates:remaining,eligible:candidates,tracked,availableSlots,recommendations:remaining.slice(0,availableSlots)};
}
function toggleNotificationTracking(name,variant){
  if(state.sharedView&&!state.sharedView.canEdit)return toast('This shared profile is read only');
  const model=notificationRecommendations(),settings=model.settings,index=settings.tracked.findIndex(row=>row.name===name);
  if(index>=0)settings.tracked.splice(index,1);
  else{
    // With every slot taken, a replacement card swaps out the first removable notification.
    const swap=!model.availableSlots&&model.replacements.some(row=>row.name===name)?model.removableTracked[0]:null;
    if(!model.availableSlots&&!swap)return toast('All purchased notification slots are already tracked');
    if(!swap&&![...model.recommendations,...model.replacements].some(row=>row.name===name))return;
    if(swap)settings.tracked.splice(settings.tracked.findIndex(row=>row.name===swap.name),1);
    settings.tracked.push({name,variant:model.variantWatch&&OWNED_VARIANTS.includes(variant)?variant:null});
    if(swap)toast(`Replaced ${swap.name} with ${name}. Update both in-game.`);
  }
  state.notificationPreferences=settings;save();route();
  [...document.querySelectorAll('[data-notification-track]')].find(button=>button.dataset.notificationTrack===name)?.focus({preventScroll:true});
}
function notificationRecommendationsHtml(){
  const model=notificationRecommendations(),{settings,slots,variantWatch,recommendations,tracked,availableSlots}=model;
  const scope=settings.priority==='next'?`Next ${settings.horizon} rebirths`:
    settings.priority==='rare'?'Rarer droids first':'Furthest rebirths first';
  const cycleScope=settings.cycles==='current'?`Current cycle ${Number(state.cycle)+1}`:settings.cycles==='next'?`Next cycle ${model.cyclePlan.nextCycle===null?'unavailable':model.cyclePlan.nextCycle+1}`:`Current cycle ${Number(state.cycle)+1}, then next cycle ${model.cyclePlan.nextCycle===null?'unavailable':model.cyclePlan.nextCycle+1}`;
  const removable=model.removableTracked;
  const card=(rec,active,replacing=false)=>{
    const alertCovered=active&&model.redundantTracked.some(row=>row.name===rec.name),ownedCovered=active&&model.ownedTracked.some(row=>row.name===rec.name),stale=active&&model.staleTracked.some(row=>row.name===rec.name),deferred=active&&model.deferredTracked.some(row=>row.name===rec.name),redundant=alertCovered||ownedCovered||stale||deferred;
    const d=fusionDroid(rec.name),matched=model.eligible.find(row=>row.name===rec.name),need=active?matched:rec;
    const have=need?.have||state.owned.filter(row=>row.name===rec.name&&OWNED_VARIANTS.includes(row.variant)).reduce((best,row)=>!best||variantStep(row.variant)>variantStep(best)?row.variant:best,null);
    const threshold=variantWatch&&rec.variant?notificationRangeText(rec.variant,settings):'Any variant',upgrade=ownedCovered&&model.upgrades.find(row=>row.name===rec.name);
    const detail=`<small>Owned${need?.nextCycleOnly?' this cycle':''}: ${have?variantText(have):'None'}</small><small>${active?'Tracking':'Track'}: ${threshold}</small>`+
      (need?`<small>Rebirth needs: ${need.needs.map(n=>`${settings.cycles!=='current'?`${n.nextCycle?'Next':'Current'} cycle ${n.cycle+1} · `:''}R: ${n.at} · ${variantLabel(n.variant)}`).join('; ')}</small>`:'')+
      (need?.nextCycleOnly?'<small>Collect a copy for a friend or alt to hold for next cycle.</small>':'')+
      (active&&matched&&variantWatch&&rec.variant!==matched.variant?`<small>Now recommended: ${notificationRangeText(matched.variant,settings)}. Unmark this card, update it in-game, then mark it again.</small>`:'')+
      (alertCovered?`<small class="notification-remove-reason">Rebirth Droid Alert covers this droid for R: ${model.alertRebirth}. Remove its Droidex notification in-game, then unmark it here to free a slot.</small>`:'')+
      (ownedCovered&&!alertCovered?`<small class="notification-remove-reason">${upgrade?`Upgrading your ${variantText(upgrade.have)} to ${variantText(upgrade.variant)} costs ${fmt(upgrade.chips)} chips, within your limit.`:have?`You own ${variantText(have)}, which covers its current-cycle needs.`:'Your rebirth tracker already marks its current-cycle needs.'} Remove its Droidex notification in-game, then unmark it here to free a slot.</small>`:'')+
      (stale?`<small class="notification-remove-reason">No rebirth still needs it within your notification settings (R: ${state.rebirth} reached). Remove its Droidex notification in-game, then unmark it here to free a slot.</small>`:'')+
      (deferred?`<small class="notification-remove-reason">Only needed next cycle, while current-cycle droids are still waiting for a slot. Swap it for one below and collect the next-cycle copy later.</small>`:'')+
      (replacing?`<small>Replaces ${escapeAttr(removable[0]?.name||'')}.</small>`:'');
    return `<li><button class="notification-card ${active?'is-tracked':''} ${redundant?'is-redundant':''}" type="button" data-notification-track="${escapeAttr(rec.name)}" data-notification-variant="${rec.variant||''}" aria-pressed="${active}" ${state.sharedView&&!state.sharedView.canEdit?'disabled':''}>${d?picture(d,rec.variant||'DEFAULT'):''}<span><strong>${escapeAttr(rec.name)}</strong>${detail}</span><em>${redundant?'Unmark':active?'✓ Tracking':replacing?'⇄ Replace':'+ Track'}</em></button></li>`;
  };
  return `<section class="notification-panel"><header><div><p class="eyebrow">Prepare for rebirth</p><h2>Droidex Notifications</h2><p>${cycleScope} · ${scope} · from R: ${settings.startRebirth} through R: ${rebirthGoal()} · ${tracked.length}/${slots} slots tracked · ${availableSlots} free</p></div><button class="btn secondary" type="button" data-notification-settings>Settings</button></header>
    ${settings.cycles!=='current'?notificationNextCycleNotice():''}
    ${settings.cycles!=='current'&&model.cyclePlan.nextCycle===null?'<p>Next-cycle requirements are unavailable. No next-cycle recommendations can be made.</p>':''}
    ${model.rebirthAlert?`<p class="picker-hint">Rebirth Droid Alert is owned. Droids required for your next rebirth (R: ${model.alertRebirth}) are excluded from recommendations because their alerts use no Droidex notification slots.</p>`:''}
    ${removable.length?`<h3>Recommended to remove</h3><ul class="notification-list notification-tracked notification-redundant">${removable.map(rec=>card(rec,true)).join('')}</ul>`:''}
    ${model.upgrades.length?`<h3>Upgrade instead</h3><ul class="notification-list notification-upgrades">${model.upgrades.map(row=>{const d=fusionDroid(row.name);return `<li><div class="notification-card is-upgrade">${d?picture(d,row.variant):''}<span><strong>${escapeAttr(row.name)}</strong><small>Owned: ${variantText(row.have)}</small><small>Upgrade to ${variantText(row.variant)} for ${fmt(row.chips)} chips · R: ${row.at}</small></span></div></li>`}).join('')}</ul>`:''}
    ${model.replacements.length?`<h3>Track instead</h3><ul class="notification-list notification-replacements">${model.replacements.map(rec=>card(rec,false,!availableSlots)).join('')}</ul>`:''}
    ${tracked.length>removable.length?`<h3>Currently tracking</h3><ul class="notification-list notification-tracked">${tracked.filter(rec=>!removable.includes(rec)).map(rec=>card(rec,true)).join('')}</ul>`:''}
    ${tracked.length>slots?'<p class="form-error">More notifications are marked than your purchased slots. Unmark any you are no longer tracking, or update your purchases in Settings.</p>':''}
    ${!slots?'<p>No notification slots recorded. Set your purchased level in <a href="#/nova-shop/droidex-notifications">Nova Shop</a> or Settings. Each slot costs 20 Nova Crystals, up to 10.</p>':recommendations.length?`<h3>Recommended for free slots</h3><ul class="notification-list notification-recommended">${recommendations.map(rec=>card(rec,false)).join('')}</ul>`:!availableSlots?'<p>All notification slots are marked as tracked. Unmark one to see another recommendation.</p>':'<p>No missing spawnable droids match these settings. Your owned droids already cover them, or you can widen the rebirth range.</p>'}
    ${slots?`<p class="picker-hint">${variantWatch?'Variant Watch is owned: select the recommended variant to include it and higher variants.':'Notifications track the droid only. Variant Watch (100 Nova Crystals) adds variant targeting.'} Marking a card records what you set in-game; it does not change the game’s notifications.${model.candidates.length>availableSlots+model.replacements.length?` ${model.candidates.length-availableSlots-model.replacements.length} more droids fall outside your free slots.`:''}</p>`:''}</section>`;
}
function notificationNextCycleNotice(){return '<aside class="notification-cycle-notice"><strong>Next-cycle preparation requires a friend or alt.</strong><p>Have them pick up and hold these droids before you Super Rebirth, then return them afterwards. Blueprints left on your floor disappear when you Super Rebirth. Your current Base droids are not counted as saved for next cycle. Marking a notification as tracked only records the alert, not a droid held by someone else.</p></aside>';}
function closePlanningSettings(root){root.innerHTML='';route();}
function showNotificationSettings(){
  const root=document.querySelector('#modalRoot'),{settings,slots,variantWatch}=notificationRecommendations();
  root.innerHTML=`<div class="modal-backdrop"><section class="modal planning-settings-modal" role="dialog" aria-modal="true" aria-labelledby="notificationSettingsTitle"><h2 id="notificationSettingsTitle">Droidex Notifications</h2>
    <p>Recommend missing droids for this profile’s future rebirths. Set the recommendations in the game’s Droidex.</p>
    <label class="field">Plan for<select class="form-control" id="notificationCycles"><option value="current" ${settings.cycles==='current'?'selected':''}>Current cycle only</option><option value="both" ${settings.cycles==='both'?'selected':''}>Current and next cycle</option><option value="next" ${settings.cycles==='next'?'selected':''}>Next cycle only</option></select><small>Current and next cycle fills spare notification slots after current-cycle recommendations. Next cycle only uses all available slots for preparation.</small></label>
    <div id="notificationNextCycleNotice" ${settings.cycles==='current'?'hidden':''}>${notificationNextCycleNotice()}</div>
    <label class="field">Start at rebirth<input class="form-control" id="notificationStartRebirth" type="number" min="1" max="40" value="${settings.startRebirth}"><small>Applies to each selected cycle. Set 11 to exclude rebirths 1–10. Completed rebirths in your current cycle are always skipped.</small></label>
    <label class="field">Prioritise<select class="form-control" id="notificationPriority"><option value="next" ${settings.priority==='next'?'selected':''}>Next few rebirths</option><option value="rare" ${settings.priority==='rare'?'selected':''}>Rarer droids first (Mythics before lower rarities)</option><option value="furthest" ${settings.priority==='furthest'?'selected':''}>Furthest future rebirths first</option></select></label>
    <label class="field" id="notificationHorizonField" ${settings.priority==='next'?'':'hidden'}>Number of upcoming rebirths<input class="form-control" id="notificationHorizon" type="number" min="1" max="40" value="${settings.horizon}"><small>Counts from the starting rebirth in each cycle, or your next uncompleted rebirth if later. Choose Rarer droids first or Furthest future rebirths first to cover the full range.</small></label>
    <label class="planning-check"><input type="checkbox" id="notificationUpgrades" ${settings.ownedPolicy==='upgrades'?'checked':''} ${variantWatch?'':'disabled'}>Recommend higher variants of owned droids (requires Variant Watch)</label>
    <label class="field">Variant target<select class="form-control" id="notificationUpgradeTarget" ${variantWatch&&settings.ownedPolicy==='upgrades'?'':'disabled'}><option value="required" ${settings.upgradeTarget==='required'?'selected':''}>Rebirth requirement and above</option><option value="next" ${settings.upgradeTarget==='next'?'selected':''}>Any improvement</option></select><small>For this cycle, Any improvement tracks Default and above when you own none, or one variant above your best owned copy. Own Rainbow and need Stellar? Track Beskar and above to reduce future chip costs. Next-cycle preparation targets the rebirth requirement.</small></label>
    <label class="field">Upgrade instead at or below<input class="form-control" id="notificationUpgradeChips" type="number" min="0" step="1" placeholder="Off" value="${settings.upgradeChipLimit??''}"><small>Chips. When upgrading an owned copy to a current-cycle requirement costs this much or less, recommend the upgrade instead of a notification. Leave blank to turn off.</small></label>
    <label class="planning-check"><input type="checkbox" id="notificationRangeFromTop" ${settings.rangeFromTop?'checked':''}>Show tracked variants from the top (${variantLabel(VARIANTS.at(-1))} and below)</label>
    <label class="field">Notification slots already bought<select class="form-control" id="notificationSlots">${Array.from({length:11},(_,n)=>`<option value="${n}" ${n===slots?'selected':''}>${n} slot${n===1?'':'s'}${n?` · ${n*20} Nova total`:''}</option>`).join('')}</select></label>
    <label class="planning-check"><input type="checkbox" id="notificationVariantWatch" ${variantWatch?'checked':''}>I own Variant Watch (100 Nova Crystals)</label>
    <label class="planning-check"><input type="checkbox" id="notificationRebirthAlert" ${Number(state.novaUpgrades?.['rebirth-droid-alert'])>0?'checked':''}>I own Rebirth Droid Alert (10 Nova Crystals)</label>
    <p class="picker-hint">Rebirth Droid Alert covers the rebirth you are working toward without using a Droidex notification slot. Those droids are excluded from recommendations, and tracked copies are flagged for removal.</p>
    <details class="notification-manual"><summary>Already tracking a different droid?</summary><p>Add it here so its slot is counted too. To free a slot, unmark its card in Currently tracking.</p>
    <label class="field">Droid<select class="form-control" id="notificationManualDroid"><option value="">Choose a droid</option>${state.droids.filter(d=>!isIconic(d)&&!isFusion(d)&&!settings.tracked.some(row=>row.name===d.name)).sort((a,b)=>a.name.localeCompare(b.name)).map(d=>`<option value="${escapeAttr(d.name)}">${escapeAttr(d.name)}</option>`).join('')}</select></label>
    <label class="field">Notification variant<select class="form-control" id="notificationManualVariant" ${variantWatch?'':'disabled'}><option value="">Any variant</option>${[...VARIANTS,'SCOURGE'].map(v=>`<option value="${v}">${variantLabel(v)}</option>`).join('')}</select></label>
    <button class="btn secondary" type="button" id="notificationManualAdd">Add tracked droid</button><p id="notificationManualStatus" role="status">${settings.tracked.length} marked as tracked</p></details>
    <p class="picker-hint">Purchases share the same record as Nova Shop. Each selected cycle stops at your Super Rebirth goal. A droid uses one slot even when several rebirths or both cycles need it.</p><div class="modal-actions"><button class="btn" id="saveNotificationSettings">Save settings</button><button class="btn secondary" id="cancelNotificationSettings">Cancel</button></div></section></div>`;
  root.querySelector('#notificationCycles').onchange=e=>root.querySelector('#notificationNextCycleNotice').hidden=e.target.value==='current';
  root.querySelector('#notificationPriority').onchange=e=>root.querySelector('#notificationHorizonField').hidden=e.target.value!=='next';
  const updateUpgradeTarget=()=>{root.querySelector('#notificationUpgradeTarget').disabled=!root.querySelector('#notificationVariantWatch').checked||!root.querySelector('#notificationUpgrades').checked;};
  root.querySelector('#notificationUpgrades').onchange=updateUpgradeTarget;
  root.querySelector('#notificationVariantWatch').onchange=e=>{root.querySelector('#notificationUpgrades').disabled=!e.target.checked;root.querySelector('#notificationManualVariant').disabled=!e.target.checked;updateUpgradeTarget();};
  root.querySelector('#notificationManualAdd').onclick=()=>{
    const select=root.querySelector('#notificationManualDroid'),name=select.value,status=root.querySelector('#notificationManualStatus');
    if(!name)return status.textContent='Choose a droid first.';
    if(settings.tracked.length>=Number(root.querySelector('#notificationSlots').value))return status.textContent='All purchased slots are already marked as tracked.';
    settings.tracked.push({name,variant:root.querySelector('#notificationVariantWatch').checked?root.querySelector('#notificationManualVariant').value||null:null});
    select.selectedOptions[0].remove();select.value='';status.textContent=`${settings.tracked.length} marked as tracked. Save settings to keep this change.`;
  };
  root.querySelector('#saveNotificationSettings').onclick=()=>{
    state.notificationPreferences=normaliseNotificationPreferences({...settings,priority:root.querySelector('#notificationPriority').value,horizon:root.querySelector('#notificationHorizon').value,startRebirth:root.querySelector('#notificationStartRebirth').value,cycles:root.querySelector('#notificationCycles').value,ownedPolicy:root.querySelector('#notificationUpgrades').checked?'upgrades':'missing',upgradeTarget:root.querySelector('#notificationUpgradeTarget').value,upgradeChipLimit:root.querySelector('#notificationUpgradeChips').value,rangeFromTop:root.querySelector('#notificationRangeFromTop').checked});
    state.novaUpgrades={...state.novaUpgrades,'droidex-notifications':Number(root.querySelector('#notificationSlots').value),'variant-watch':root.querySelector('#notificationVariantWatch').checked?1:0,'rebirth-droid-alert':root.querySelector('#notificationRebirthAlert').checked?1:0};
    save();closePlanningSettings(root);
  };
  root.querySelector('#cancelNotificationSettings').onclick=()=>closePlanningSettings(root);
  root.querySelector('.modal').onkeydown=e=>{if(e.key==='Escape')closePlanningSettings(root)};
  root.querySelector('#notificationPriority').focus();
}
function showFusionSettings(){
  const root=document.querySelector('#modalRoot'),settings=normaliseFusionPreferences(state.fusionPreferences);
  root.innerHTML=`<div class="modal-backdrop"><section class="modal planning-settings-modal" role="dialog" aria-modal="true" aria-labelledby="fusionSettingsTitle"><h2 id="fusionSettingsTitle">Fusion settings</h2>
    <p>Choose what Optimise should make from spare droids. Droids reserved for rebirths stay protected.</p>
    <label class="field">Common through Legendary<select class="form-control" id="fusionGoal"><option value="balanced" ${settings.goal==='balanced'?'selected':''}>Balanced fusion progress</option><option value="rarity" ${settings.goal==='rarity'?'selected':''}>Higher rarity</option><option value="variant" ${settings.goal==='variant'?'selected':''}>Higher variant of the same droid</option></select></label>
    <label class="field">Mythic droids<select class="form-control" id="fusionMythics"><option value="variant" ${settings.mythics==='variant'?'selected':''}>Upgrade variants; reroll dormant Kybers</option><option value="reroll" ${settings.mythics==='reroll'?'selected':''}>Reroll for another Mythic</option><option value="off" ${settings.mythics==='off'?'selected':''}>Keep Mythics out of fusion</option></select></label>
    <label class="planning-check"><input type="checkbox" id="fusionRecipes" ${settings.recipes?'checked':''}>Allow named Fusion recipes that fit the selected goal</label>
    <p class="picker-hint">Three identical droids upgrade their variant and keep their identity. Mixed-name Mythics at the same variant also upgrade, but the resulting droid is random. Dormant Kyber Mythics reroll at dormant Kyber. If no suitable batch exists, no fusion is recommended. Use Keep for fusion rules to save spare inputs until then.</p>
    <div class="modal-actions"><button class="btn" id="saveFusionSettings">Save settings</button><button class="btn secondary" id="cancelFusionSettings">Cancel</button></div></section></div>`;
  root.querySelector('#saveFusionSettings').onclick=()=>{
    state.fusionPreferences=normaliseFusionPreferences({goal:root.querySelector('#fusionGoal').value,mythics:root.querySelector('#fusionMythics').value,recipes:root.querySelector('#fusionRecipes').checked});save();closePlanningSettings(root);
  };
  root.querySelector('#cancelFusionSettings').onclick=()=>closePlanningSettings(root);
  root.querySelector('.modal').onkeydown=e=>{if(e.key==='Escape')closePlanningSettings(root)};
  root.querySelector('#fusionGoal').focus();
}
// ---- Fusion Lab -----------------------------------------------------------
// Three droids go in, one comes out. The recipes are data, so this page is a
// rendering of data/fusion.json rather than anything hand-maintained.
const fusionRecipes=()=>state.fusion?.recipes||[];
const fusionDroid=name=>state.droids.find(d=>d.name===String(name||'').toUpperCase());
// How many of a droid you hold, counting every variant: fusion consumes the
// droid, not a particular quality of it.
const fusionOwnedCount=name=>{const d=fusionDroid(name);return d?state.owned.filter(x=>x.name===d.name).reduce((total,x)=>total+(Number(x.qty)||1),0):0};
// A recipe needs three droids and the same one can appear twice, so what
// matters is whether you hold enough of each, not whether you hold any.
function fusionNeed(recipe){
  const wanted=new Map();
  for(const input of recipe.inputs)wanted.set(input,(wanted.get(input)||0)+1);
  const parts=[...wanted].map(([name,need])=>{const have=fusionOwnedCount(name);return{name,need,have,short:Math.max(0,need-have)}});
  return{parts,ready:parts.every(part=>part.short===0),missing:parts.filter(part=>part.short>0)};
}
// Which results you are working towards. Drives the Fusion Outlook on Base.
const FUSION_WANTED_KEY='droid-archive-fusion-wanted';
function fusionWanted(){try{return new Set(JSON.parse(localStorage.getItem(FUSION_WANTED_KEY)||'[]'))}catch{return new Set()}}
function setFusionWanted(names){localStorage.setItem(FUSION_WANTED_KEY,JSON.stringify([...names]));}
function toggleFusionWanted(name){const wanted=fusionWanted();wanted.has(name)?wanted.delete(name):wanted.add(name);setFusionWanted(wanted);return wanted.has(name)}
function fusionCardHtml(name,role,stock){
  const d=fusionDroid(name);
  const art=d?picture(d,'DEFAULT'):'<div class="fusion-blank" aria-hidden="true">?</div>';
  const rarity=d?`<em class="fusion-rarity rarity-${String(d.rarity).toLowerCase()}">${escapeAttr(d.rarity)}</em>`:'';
  const label=escapeAttr(d?d.name:name);
  // "2 of 2" reads better than a tick when a recipe wants two of the same droid.
  const held=stock?`<em class="fusion-stock ${stock.short?'is-short':'is-held'}">${stock.have} of ${stock.need}</em>`:'';
  const inner=`${rarity}<div class="fusion-art">${art}</div><strong>${label}</strong>${held}`;
  return d
    ? `<a class="fusion-card fusion-${role}" href="#/droid/${slug(d.name)}">${inner}</a>`
    : `<div class="fusion-card fusion-${role} is-unknown">${inner}</div>`;
}
// What the droids you are tracking still need. It renders even with nothing
// tracked: an empty panel that says where to pick some is findable, whereas a
// panel that only appears once you have already found the Fusion Lab is not —
// and its Hide button cannot exist before the panel does.
// Every recipe a droid is an ingredient for, with the rest of that recipe's
// ingredients and whether you hold them. Shown in the droid picker so choosing
// what to put in a Fusion slot does not mean going and looking it up.
const fusionHintsEnabled=()=>localStorage.getItem('droid-archive-picker-fusion-hints')!=='0';
function fusionUsesHtml(name){
  if(!fusionHintsEnabled())return'';
  const uses=fusionRecipes().filter(recipe=>recipe.inputs.includes(name));
  if(!uses.length)return'';
  const rows=uses.map(recipe=>{
    const need=fusionNeed(recipe);
    const others=need.parts.filter(part=>part.name!==name)
      .map(part=>`<em class="${part.short?'is-short':'is-held'}">${escapeAttr(part.name)}${part.need>1?` x${part.need}`:''}</em>`).join(' + ');
    return `<span class="fusion-use ${need.ready?'is-ready':''}"><b>${escapeAttr(recipe.name)}</b>${others?` &larr; ${others}`:''}</span>`;
  }).join('');
  return `<small class="fusion-uses">${rows}</small>`;
}

// ---- Fusing ---------------------------------------------------------------
// Three droids in the Fusion slots become one in a Fusion Build slot. A known
// recipe names the result; anything else produced an ordinary droid and we ask
// which, because that is the thing nobody has written down yet.
const fusionKey=names=>[...names].map(name=>String(name).toUpperCase()).sort().join('+');
const fusionRecipeFor=names=>{const key=fusionKey(names);return fusionRecipes().find(recipe=>fusionKey(recipe.inputs)===key)||null};
const FUSION_LOG_KEY='droid-archive-fusion-log';
function fusionLogAll(){try{const rows=JSON.parse(localStorage.getItem(FUSION_LOG_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
function fusionLogAdd(row){const rows=fusionLogAll();rows.push({...row,at:new Date().toISOString()});localStorage.setItem(FUSION_LOG_KEY,JSON.stringify(rows.slice(-500)));}
// What each combination has produced so far, most seen first. This is the point
// of recording them: which inputs give which result, and how often.
function fusionLogSummary(){
  const byKey=new Map();
  for(const row of fusionLogAll()){
    const key=fusionKey(row.inputs||[]);
    const entry=byKey.get(key)||{key,inputs:row.inputs||[],total:0,results:new Map()};
    entry.total++;
    const label=`${row.result?.name||'?'}${row.result?.rarity?` (${row.result.rarity})`:''}`;
    entry.results.set(label,(entry.results.get(label)||0)+1);
    byKey.set(key,entry);
  }
  return [...byKey.values()].map(entry=>({...entry,results:[...entry.results].sort((a,b)=>b[1]-a[1])}))
    .sort((a,b)=>b.total-a.total);
}
const firstFreeFusionBuildSlot=()=>{const placed=placements().placed;return stationSlotIndices('FUSION_BUILD').find(index=>!placed.some(x=>x.station==='FUSION_BUILD'&&x.slot===index))??-1};
// Everything currently sitting in the Fusion slots.
const fusionSlotUnits=()=>placements().placed.filter(x=>x.station==='FUSION').sort((a,b)=>a.slot-b.slot);
function runFusion(onDone){
  const units=fusionSlotUnits();
  if(units.length<3)return toast('Fusion needs three droids in the Fusion slots');
  const free=firstFreeFusionBuildSlot();
  if(free<0)return toast('Every Fusion Build slot is busy');
  const warning=traitLossText(units);if(warning&&!confirm(warning+'Fusion Preservation keeps its droid but consumes its trait. Continue with fusion?'))return;
  const names=units.map(unit=>unit.name);
  const recipe=fusionRecipeFor(names);
  const finish=(result)=>{
    // Take the three out before putting the result in, so the fused droids are
    // spent whatever the outcome was.
    const indices=materializePlacements(placements());
    const rows=units.map(unit=>indices.get(`${unit.source}:${unit.unit}`)).filter(index=>Number.isInteger(index)).sort((a,b)=>b-a);
    for(const index of rows){const row=state.owned[index];if(traitAmount(row,14,'FUSION')){delete row.trait;}else removeOwnedUnit(index,true);}
    commitOwned(result.name,result.variant||'DEFAULT',1,'FUSION_BUILD',free);
    fusionLogAdd({inputs:units.map(unit=>({name:unit.name,variant:unit.variant})),
      result:{name:result.name,variant:result.variant||'DEFAULT',rarity:result.rarity||state.droids.find(d=>d.name===result.name)?.rarity||''},
      matched:Boolean(recipe)});
    save();
    toast(`Fused into ${variantLabel(result.variant||'DEFAULT')} ${result.name}`);
    onDone?.();
  };
  const outcome=fusionOutcome(units);
  if(outcome&&outcome.kind==='capped')return toast(`${outcome.name} is already ${variantLabel(outcome.variant)}, the top quality`);
  if(outcome&&(outcome.kind==='recipe'||outcome.kind==='quality'))return finish({name:outcome.name,variant:outcome.variant,rarity:outcome.rarity});
  showFusionResultPrompt(names,finish,outcome);
}
// No recipe matched, so the game made something ordinary. Which one is the
// measurement, so it is asked rather than guessed.
function showFusionResultPrompt(names,onPick,outcome){
  const root=document.querySelector('#modalRoot');
  // A rarity step fixes the rarity and the quality but not which droid, so
  // only that rarity is worth offering.
  const stepped=outcome&&outcome.kind==='rarity';
  const variant=outcome?.variant||'DEFAULT';
  const choices=state.droids.filter(d=>!isFusion(d)&&(!stepped||d.rarity===outcome.rarity)).sort((a,b)=>a.name.localeCompare(b.name));
  root.innerHTML=`<div class="modal-backdrop"><section class="modal slot-picker" role="dialog" aria-modal="true">
    <p class="eyebrow">Droid Fusion</p><h2>What came out?</h2>
    <p class="picker-hint">${names.map(escapeAttr).join(' + ')} ${stepped?`rolls a ${rarityLabel(outcome.rarity)} at ${variantLabel(variant)} — the rarity and the quality are settled, the droid is not. Pick which one came out`:'is not a combination anyone has recorded. Pick what it produced'} and it goes in the log, so the next person knows.</p>
    <input id="fusionResultSearch" class="form-control picker-search" placeholder="Search droids…" autofocus>
    <div id="fusionResultList" class="picker-results"></div>
    <div class="modal-actions"><button class="btn ghost" id="fusionResultCancel" type="button">Cancel</button></div></section></div>`;
  const draw=()=>{
    const query=root.querySelector('#fusionResultSearch').value.toLowerCase();
    root.querySelector('#fusionResultList').innerHTML=choices.filter(d=>d.name.toLowerCase().includes(query))
      .map(d=>`<button class="picker-droid" data-result="${escapeAttr(d.name)}"><span>${picture(d,variant)}</span><b>${escapeAttr(d.name)}</b><small>${rarityText(d.rarity)} &middot; ${d.type}</small></button>`).join('')||'<p class="roster-empty">No matching droids.</p>';
    root.querySelectorAll('[data-result]').forEach(button=>button.onclick=()=>{
      const d=state.droids.find(x=>x.name===button.dataset.result);
      root.innerHTML='';
      onPick({name:d.name,variant,rarity:d.rarity});
    });
  };
  root.querySelector('#fusionResultSearch').oninput=draw;
  root.querySelector('#fusionResultCancel').onclick=()=>root.innerHTML='';
  draw();
}

// ---- What a fusion produces ----------------------------------------------
// Quality is decided by the worst droid in the room: two Stellar and a Rainbow
// come out Rainbow. That is the whole reason a Fusion droid has to be fused at
// the quality you want - unlike every other droid it cannot be upgraded after.
const RARITY_LADDER=['COMMON','RARE','EPIC','LEGENDARY','MYTHIC'];
function normaliseFusionKeepRules(value){return Array.isArray(value)?value.filter(x=>x&&OWNED_VARIANTS.includes(x.variant)&&(typeof x.name==='string'&&x.name.trim()||RARITY_LADDER.includes(x.rarity))).map(x=>x.name?{name:x.name,variant:x.variant,...(x.upgradeOnly===true?{upgradeOnly:true}:{})}:{rarity:x.rarity,variant:x.variant}):[];}
function fusionReservedForUpgrade(unit){
  return normaliseFusionKeepRules(state.fusionKeepRules).some(rule=>rule.upgradeOnly&&rule.name===unit.name&&rule.variant===unit.variant);
}
function fusionUpgradeTarget(variant){return variant==='KYBER_GREEN'?'KYBER_BLUE':variant==='KYBER_BLUE'?'KYBER_PURPLE':nextVariant(variant);}
function keepForFusion(unit){
  const d=state.droids.find(d=>d.name===unit.name);if(!d||isIconic(d))return false;
  return normaliseFusionKeepRules(state.fusionKeepRules).some(rule=>rule.name?rule.name===unit.name&&rule.variant===unit.variant:RARITY_LADDER.indexOf(d.rarity)>=RARITY_LADDER.indexOf(rule.rarity)&&variantRank(unit.variant)>=variantRank(rule.variant));
}
function fusionBuildSection(html){return html.replace(/<header>[\s\S]*?<\/header>/,header=>{const count=header.match(/<small>([\s\S]*?)<\/small>/)?.[1]||'';return `<div class="upper-level-divider protocol-divider fusion-build-divider" title="${escapeAttr(count)}"><span>Fusion Build</span></div>`;});}
function fusionKeepSettings(){return `<button class="btn secondary" type="button" data-fusion-keep-settings>Keep for fusion (${normaliseFusionKeepRules(state.fusionKeepRules).length} rules)</button>`;}
function showAstromechSettings(){
  const root=document.querySelector('#modalRoot'),iconics=state.droids.filter(d=>d.type==='ASTROMECH'&&isIconic(d)).sort((a,b)=>a.name.localeCompare(b.name));
  root.innerHTML=`<div class="modal-backdrop"><section class="modal astromech-settings-modal" role="dialog" aria-modal="true" aria-labelledby="astromechSettingsTitle"><h2 id="astromechSettingsTitle">Astromech Settings</h2><p>Choose how Optimise places each Astromech Iconic. Mission reserves a mission slot. Credit Gain lets Optimise choose the best earning work slot. Locked slots still take priority.</p><div class="astromech-role-list">${iconics.map(d=>`<label class="astromech-role-row">${picture(d,'DEFAULT')}<span><strong>${escapeAttr(d.name)}</strong>${state.owned.some(x=>x.name===d.name)?'':'<small>Not owned yet</small>'}</span><select class="form-control" data-astromech-role="${escapeAttr(d.name)}" aria-label="${escapeAttr(d.name)} placement"><option value="mission" ${astromechIconicRole(d.name)==='mission'?'selected':''}>Mission</option><option value="credits" ${astromechIconicRole(d.name)==='credits'?'selected':''}>Credit Gain</option></select></label>`).join('')}</div><p class="picker-hint">Saved to this profile. Mission is the default for every Iconic.</p><div class="modal-actions"><button class="btn" id="closeAstromechSettings">Done</button></div></section></div>`;
  root.querySelectorAll('[data-astromech-role]').forEach(select=>select.onchange=()=>{
    state.astromechIconicRoles={...normaliseAstromechIconicRoles(state.astromechIconicRoles),[select.dataset.astromechRole]:select.value};save();
  });
  const close=()=>{root.innerHTML='';route();document.querySelector('[data-astromech-settings]')?.focus();};
  root.querySelector('#closeAstromechSettings').onclick=close;
  root.querySelector('.modal-backdrop').onclick=event=>{if(event.target===event.currentTarget)close();};
  root.querySelector('.modal').onkeydown=event=>{if(event.key==='Escape'){event.stopPropagation();close();}};
  root.querySelector('select')?.focus();
}
function showFusionKeepSettings(){
  const root=document.querySelector('#modalRoot'),rules=normaliseFusionKeepRules(state.fusionKeepRules);
  const choices=state.droids.filter(d=>!isIconic(d)).sort((a,b)=>a.name.localeCompare(b.name));
  root.innerHTML=`<div class="modal-backdrop"><section class="modal planning-settings-modal" role="dialog" aria-modal="true" aria-labelledby="fusionKeepTitle"><h2 id="fusionKeepTitle">Keep for fusion</h2><p>Rules are saved with this profile. Matching droids can still work, but Optimise will not sell them.</p><ul>${rules.map((r,i)=>`<li>${escapeAttr(r.name?`${r.name} / ${variantLabel(r.variant)}${r.upgradeOnly?' — same-droid upgrade only':' (any fusion)'}`:`${r.rarity}+ / ${r.variant}+ (any fusion)`)} <button class="btn ghost" data-remove-fusion-rule="${i}" aria-label="Remove ${escapeAttr(r.name||r.rarity)} fusion rule">Remove</button></li>`).join('')||'<li>No rules yet.</li>'}</ul>
    <h3>Save for same-droid upgrade</h3><p>Keep all copies of a specific droid and variant until three can upgrade together. No mixed-droid fusions or recipes will use them. The result is not used in another fusion in the same plan. This takes priority over general fusion goals. Fuse instead of selling must be enabled; Keep Mythics out of fusion still blocks Mythic upgrades.</p>
    <label class="field">Search droids<input class="form-control" id="fusionUpgradeSearch" type="search" placeholder="Search droids…"></label>
    <label class="field">Droid<select class="form-control" id="fusionUpgradeName">${choices.map(d=>`<option value="${escapeAttr(d.name)}">${escapeAttr(d.name)}</option>`).join('')}</select></label>
    <label class="field">Variant to save<select class="form-control" id="fusionUpgradeVariant">${OWNED_VARIANTS.filter(v=>fusionUpgradeTarget(v)).map(v=>`<option value="${v}" ${v==='STELLAR'?'selected':''}>${variantLabel(v)} → ${variantLabel(fusionUpgradeTarget(v))}</option>`).join('')}</select></label>
    <p class="picker-hint" id="fusionUpgradeCount" aria-live="polite"></p><button class="btn" id="addFusionUpgradeRule">Save for upgrade</button>
    <h3>Keep spares for any fusion</h3><label class="field">Minimum rarity<select class="form-control" id="fusionKeepRarity">${RARITY_LADDER.map(r=>`<option ${r==='LEGENDARY'?'selected':''}>${r}</option>`).join('')}</select></label><label class="field">Minimum quality<select class="form-control" id="fusionKeepVariant">${VARIANTS.map(v=>`<option ${v==='BESKAR'?'selected':''}>${v}</option>`).join('')}</select></label><p>For example, add Legendary+ / Beskar+, then Mythic+ / Diamond+. Same-droid upgrade rules always protect their copies from mixed fusions.</p><div class="modal-actions"><button class="btn" id="addFusionKeepRule">Add rule</button><button class="btn secondary" id="closeFusionKeepRules">Done</button></div></section></div>`;
  const nameSelect=root.querySelector('#fusionUpgradeName'),variantSelect=root.querySelector('#fusionUpgradeVariant');
  const updateCount=()=>{const count=state.owned.filter(x=>x.name===nameSelect.value&&x.variant===variantSelect.value).reduce((n,x)=>n+(Number(x.qty)||1),0);root.querySelector('#fusionUpgradeCount').textContent=nameSelect.value?`${count} owned at this variant. Three matching, unlocked, finished copies are needed. Locked copies and unfinished builds stay protected.`:'No matching droids.';root.querySelector('#addFusionUpgradeRule').disabled=!nameSelect.value;};
  root.querySelector('#fusionUpgradeSearch').oninput=event=>{const selected=nameSelect.value,query=event.target.value.trim().toLowerCase();nameSelect.innerHTML=choices.filter(d=>d.name.toLowerCase().includes(query)).map(d=>`<option value="${escapeAttr(d.name)}">${escapeAttr(d.name)}</option>`).join('');if([...nameSelect.options].some(x=>x.value===selected))nameSelect.value=selected;updateCount();};
  nameSelect.onchange=updateCount;variantSelect.onchange=updateCount;updateCount();
  root.querySelector('#addFusionUpgradeRule').onclick=()=>{if(!nameSelect.value)return;const rule={name:nameSelect.value,variant:variantSelect.value,upgradeOnly:true},existing=rules.find(r=>r.name===rule.name&&r.variant===rule.variant);if(existing)existing.upgradeOnly=true;else rules.push(rule);state.fusionKeepRules=rules;save();showFusionKeepSettings();};
  root.querySelector('#addFusionKeepRule').onclick=()=>{const rule={rarity:root.querySelector('#fusionKeepRarity').value,variant:root.querySelector('#fusionKeepVariant').value};if(!rules.some(r=>JSON.stringify(r)===JSON.stringify(rule)))rules.push(rule);state.fusionKeepRules=rules;save();showFusionKeepSettings();};
  root.querySelectorAll('[data-remove-fusion-rule]').forEach(b=>b.onclick=()=>{rules.splice(Number(b.dataset.removeFusionRule),1);state.fusionKeepRules=rules;save();showFusionKeepSettings();});
  root.querySelector('#closeFusionKeepRules').onclick=()=>{root.innerHTML='';route();};
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-fusion-keep-settings],[data-reserve-fusion],[data-astromech-settings],[data-fusion-settings],[data-notification-settings],[data-notification-track]');if(!button)return;
  if(state.sharedView&&!state.sharedView.canEdit)return toast('This shared profile is read only');
  if(button.hasAttribute('data-notification-track'))return toggleNotificationTracking(button.dataset.notificationTrack,button.dataset.notificationVariant);
  if(button.hasAttribute('data-fusion-settings'))return showFusionSettings();
  if(button.hasAttribute('data-notification-settings'))return showNotificationSettings();
  if(button.hasAttribute('data-astromech-settings'))return showAstromechSettings();
  if(button.hasAttribute('data-fusion-keep-settings'))return showFusionKeepSettings();
  const unit=expandedOwned().find(x=>`${x.source}:${x.unit}`===button.dataset.reserveFusion);if(!unit)return;
  const rules=normaliseFusionKeepRules(state.fusionKeepRules);if(!rules.some(r=>r.name===unit.name&&r.variant===unit.variant))rules.push({name:unit.name,variant:unit.variant});state.fusionKeepRules=rules;save();route();
});
const rarityStep=rarity=>RARITY_LADDER.indexOf(String(rarity||'').toUpperCase());
const nextRarity=rarity=>RARITY_LADDER[rarityStep(rarity)+1]||'';
const variantStep=variant=>Math.max(0,variantRank(variant));
const fusionPower=variant=>variant==='SCOURGE'?6:variantStep(variant);
const lowestVariant=variants=>variants.reduce((low,variant)=>fusionPower(variant)<fusionPower(low)?variant:low,variants[0]||'DEFAULT');
function fusionResultVariant(rows){
  const colours=['KYBER','KYBER_GREEN','KYBER_BLUE','KYBER_PURPLE'];
  if(rows.every(row=>colours.includes(row.variant)))return colours[Math.floor(rows.reduce((n,row)=>n+colours.indexOf(row.variant),0)/rows.length)];
  return baseVariant(lowestVariant(rows.map(row=>row.variant)));
}
const droidRarity=name=>fusionDroid(name)?.rarity||'';
// Three droids in, one out. A recorded recipe wins and names its result: those
// are the combinations that make the Fusion droids, and the game special cases
// them - three different Epics normally step up to a Legendary, but the three
// N-UL wants make N-UL, which is itself an Epic.
// Everything else follows the ladder. Three of one droid at one quality give
// that same droid back a quality higher, which is the one step you can aim at.
// Mixed-name inputs below Mythic step rarity up. At Mythic, the same-variant
// fallback steps the variant up instead, still choosing a random shop droid.
function fusionOutcome(units){
  const rows=(units||[]).slice(0,3).map(row=>({name:row.name,variant:row.variant||'DEFAULT'}));
  if(rows.length<3)return null;
  const recipe=fusionRecipeFor(rows.map(row=>row.name));
  const mixedQuality=rows.some(row=>row.variant!==rows[0].variant);
  const variant=fusionResultVariant(rows);
  // Specific recipes precede generic colour/rarity recipes in ResolveFusionRecipe.
  if(recipe)return{kind:'recipe',name:recipe.name,rarity:recipe.rarity,variant,mixedQuality,recipe};
  if(rows.every(row=>baseVariant(row.variant)==='KYBER')&&rows.some(row=>row.variant.startsWith('KYBER_'))){
    // Exported fusion recipes: same-name/same-colour inputs push Green ->
    // Blue -> Purple first. Other same-rarity Kybers push rarity and floor the
    // average sub-mutation ID (-1 dormant, 0 green, 1 blue, 2 purple).
    const colours=['KYBER','KYBER_GREEN','KYBER_BLUE','KYBER_PURPLE'];
    const ids=rows.map(row=>colours.indexOf(row.variant)-1),rarity=droidRarity(rows[0].name);
    if(ids.some(id=>id< -1)||!RARITY_LADDER.includes(rarity)||rows.some(row=>droidRarity(row.name)!==rarity))return{kind:'unknown',variant:'KYBER',mixedQuality:true};
    const mixedQuality=rows.some(row=>row.variant!==rows[0].variant);
    if(!mixedQuality&&rows.every(row=>row.name===rows[0].name)&&ids[0]>=0&&ids[0]<2)
      return{kind:'quality',name:rows[0].name,rarity,from:rows[0].variant,variant:colours[ids[0]+2],mixedQuality};
    if(rarity==='MYTHIC'){
      // GetNextFusionRarity fails at Mythic. The rarity-average fallback
      // requires matching colours and advances live Green/Blue by one colour.
      // Dormant Kyber stays dormant; Purple has no next live colour.
      if(mixedQuality||ids[0]===2)return{kind:'unknown',variant:rows[0].variant,mixedQuality};
      const variant=ids[0]<0?'KYBER':colours[ids[0]+2];
      return{kind:'rarity',rarity,from:rarity,variant,fromVariant:rows[0].variant,variantUpgrade:variant!==rows[0].variant,mixedQuality};
    }
    return{kind:'rarity',rarity:nextRarity(rarity)||rarity,from:rarity,variant:colours[Math.floor(ids.reduce((a,b)=>a+b,0)/3)+1],mixedQuality};
  }

  const names=[...new Set(rows.map(row=>row.name))];
  if(names.length===1){
    const d=fusionDroid(names[0]);
    // Three of one droid at three different qualities is not something anyone
    // has written down, so it is asked rather than guessed at.
    if(mixedQuality){const own=droidRarity(names[0]);return nextRarity(own)?{kind:'rarity',rarity:nextRarity(own),from:own,variant,mixedQuality}:{kind:'unknown',variant,mixedQuality};}
    if(d&&isIconic(d))return{kind:'unknown',variant,mixedQuality};
    const own=droidRarity(names[0]);
    if(nextVariant(variant))return{kind:'quality',name:names[0],rarity:own,variant:nextVariant(variant),from:variant,mixedQuality};
    // Kyber has nothing above it, so three Kyber of one droid roll a rarity
    // instead: three Legendary Kyber make a random Mythic Kyber. A Mythic
    // has no rarity above it either and rolls into another random Mythic
    // Kyber rather than being a dead end.
    if(own==='MYTHIC'&&variant==='SCOURGE')return{kind:'unknown',variant,mixedQuality};
    if(own)return{kind:'rarity',rarity:nextRarity(own)||own,from:own,variant,mixedQuality};
    return{kind:'capped',name:names[0],rarity:own,variant,mixedQuality};
  }
  const rarities=[...new Set(rows.map(row=>droidRarity(row.name)))];
  if(rarities.length===1&&rarities[0]==='MYTHIC'){
    if(variant==='SCOURGE')return{kind:'unknown',variant,mixedQuality};
    if(mixedQuality)return{kind:'unknown',variant,mixedQuality};
    const upgraded=nextVariant(variant)||variant;
    return{kind:'rarity',rarity:'MYTHIC',from:'MYTHIC',variant:upgraded,fromVariant:variant,variantUpgrade:upgraded!==variant,mixedQuality};
  }
  if(rarities.length===1&&RARITY_LADDER.includes(rarities[0]))
    return{kind:'rarity',rarity:nextRarity(rarities[0])||rarities[0],from:rarities[0],variant,mixedQuality};
  return{kind:'unknown',variant,mixedQuality};
}
// One line saying what the three in the slots are about to become.
function fusionOutcomeText(outcome){
  if(!outcome)return'';
  const q=variantText(outcome.variant);
  if(outcome.kind==='recipe')return `<strong>${escapeAttr(outcome.name)}</strong> &middot; ${rarityText(outcome.rarity)} &middot; ${q}`;
  if(outcome.kind==='quality')return `<strong>${escapeAttr(outcome.name)}</strong> &middot; ${rarityText(outcome.rarity)} &middot; ${q} <em>(a quality up from ${variantLabel(outcome.from)})</em>`;
  if(outcome.kind==='capped')return `<strong>${escapeAttr(outcome.name)}</strong> is already ${variantLabel(outcome.variant)}, the top quality`;
  if(outcome.kind==='rarity')return `a random ${rarityText(outcome.rarity)} droid &middot; ${q} <em>(${outcome.variantUpgrade?`a variant up from ${variantText(outcome.fromVariant)}`:outcome.rarity===outcome.from?'Mythic reroll':`a rarity up from ${rarityLabel(outcome.from)}`})</em>`;
  return `<em>No recorded result for this combination${outcome.mixedQuality?' at mixed qualities':''}. Fusing it records what comes out.</em>`;
}

// ---- What your base could fuse --------------------------------------------
// Everything you own, counted by droid and by quality, because a fusion cares
// about both.
function fusionStock(){
  const stock=new Map();
  for(const row of state.owned||[]){
    const variant=row.variant||'DEFAULT';
    if(!stock.has(row.name))stock.set(row.name,new Map());
    const byVariant=stock.get(row.name);
    byVariant.set(variant,(byVariant.get(variant)||0)+(Number(row.qty)||1));
  }
  return stock;
}
// Copies held at this quality or better. Putting a Stellar into a Gold fusion
// is allowed, just wasteful, so a better copy still counts as cover.
function fusionCountFrom(byVariant,variant){
  if(!byVariant)return 0;
  const floor=fusionPower(variant);
  let total=0;
  for(const [held,count] of byVariant)if(fusionPower(held)>=floor)total+=count;
  return total;
}
const fusionRecipeWants=recipe=>{const wanted=new Map();for(const input of recipe.inputs)wanted.set(input,(wanted.get(input)||0)+1);return wanted};
// The best quality a recipe could come out at: the highest one where every
// ingredient is covered at that quality or better.
function fusionRecipeSelection(recipe,stock,allowOrderDependent=true){
  let best=null;
  const visit=(rows)=>{
    if(rows.length===recipe.inputs.length){
      // Equal-power Stellar/Scourge inputs depend on the physical table order.
      // Automatic plans use unambiguous sets; manual fusion honours slot order.
      if(rows.some(r=>r.variant==='SCOURGE')&&rows.some(r=>r.variant==='STELLAR')){
        if(!allowOrderDependent)return;
        rows=[...rows].sort((a,b)=>Number(b.variant==='SCOURGE')-Number(a.variant==='SCOURGE'));
      }
      const variant=fusionResultVariant(rows),score=fusionPower(variant)*10+(variant==='SCOURGE'?1:['KYBER','KYBER_GREEN','KYBER_BLUE','KYBER_PURPLE'].indexOf(variant)/4);
      const cost=rows.reduce((n,r)=>n+fusionPower(r.variant),0);
      if(best&&(best.score>score||(best.score===score&&best.cost<=cost)))return;
      const spend=[];for(const row of rows){const part=spend.find(p=>p.name===row.name&&p.variant===row.variant);if(part)part.count++;else spend.push({...row,count:1});}
      best={variant,spend,score,cost};return;
    }
    const name=recipe.inputs[rows.length];
    for(const [variant,count] of stock.get(name)||[])if(rows.filter(r=>r.name===name&&r.variant===variant).length<count)visit([...rows,{name,variant}]);
  };
  visit([]);return best;
}
function fusionBestVariant(recipe,stock){return fusionRecipeSelection(recipe,stock)?.variant||'';}
// Three of one droid at one quality make that droid a quality higher.
function fusionQualitySteps(stock){
  const steps=[];
  for(const [name,byVariant] of stock){
    const d=fusionDroid(name);
    if(!d||isIconic(d))continue;
    for(const [variant,count] of byVariant){
      const up=variant==='KYBER_GREEN'?'KYBER_BLUE':variant==='KYBER_BLUE'?'KYBER_PURPLE':nextVariant(variant);
      if(count<3||!up)continue;
      steps.push({name,rarity:d.rarity,from:variant,to:up,sets:Math.floor(count/3),have:count});
    }
  }
  return steps.sort((a,b)=>variantStep(b.to)-variantStep(a.to)||a.name.localeCompare(b.name));
}
// Enumerate random outcomes for matching rarity/variant pools. Below Mythic
// rarity rises; at Mythic the matching-variant fallback raises the variant.
function fusionRaritySteps(stock){
  const groups=new Map();
  for(const [name,byVariant] of stock){
    const d=fusionDroid(name);
    if(!d||isIconic(d)||!RARITY_LADDER.includes(d.rarity))continue;
    for(const [variant,count] of byVariant){
      if(count<1)continue;
      const quality=baseVariant(variant),key=`${d.rarity}|${quality}`;
      const group=groups.get(key)||{rarity:d.rarity,variant:quality,names:[],holdings:[],copies:0};
      group.names.push(name);group.holdings.push([name,count,variant]);group.copies+=count;groups.set(key,group);
    }
  }
  const steps=[];
  for(const group of groups.values()){
    if(group.copies<3)continue;
    // Verify the actual three inputs. Taking the first three from a pool with
    // several names used to accidentally choose a quality upgrade or recipe.
    const holdings=group.holdings.sort((a,b)=>a[0].localeCompare(b[0]));
    const combinations=[];
    for(let a=0;a<holdings.length;a++)for(let b=a;b<holdings.length;b++)for(let c=b;c<holdings.length;c++){
      const counts=new Map();for(const i of [a,b,c])counts.set(i,(counts.get(i)||0)+1);
      if([...counts].some(([i,n])=>holdings[i][1]<n))continue;
      const units=[a,b,c].map(i=>({name:holdings[i][0],variant:holdings[i][2]}));
      const outcome=fusionOutcome(units);
      if(outcome?.kind!=='rarity'||outcome.rarity!==(nextRarity(group.rarity)||group.rarity))continue;
      combinations.push([...counts]);
    }
    // Choose a batch that leaves the most further legal rarity rolls. Spending
    // all minority names first can strand three identical droids below the top quality.
    const upper=counts=>{const total=counts.reduce((a,b)=>a+b,0);return Math.min(12,Math.floor(total/3),nextVariant(group.variant)?total-Math.max(...counts):Infinity)};
    const memo=new Map();
    const pack=(counts,budget=12)=>{
      const key=budget+':'+counts.join(','),cached=memo.get(key);if(cached)return cached;
      const limit=Math.min(budget,upper(counts));let best={count:0,combo:null};if(!limit)return best;
      const choices=combinations.filter(combo=>combo.every(([i,n])=>counts[i]>=n)).map(combo=>{
        const rest=[...counts];for(const [i,n] of combo)rest[i]-=n;
        return {combo,rest,bound:Math.min(budget-1,upper(rest)),concentration:rest.reduce((sum,n)=>sum+n*n,0)};
      }).sort((a,b)=>b.bound-a.bound||a.concentration-b.concentration);
      for(const choice of choices){
        if(1+choice.bound<=best.count)continue;
        const count=1+pack(choice.rest,budget-1).count;
        if(count>best.count)best={count,combo:choice.combo};
        if(best.count>=limit)break;
      }
      memo.set(key,best);return best;
    };
    const packed=pack(holdings.map(([,count])=>count));
    const spend=packed.combo?.map(([i,count])=>({name:holdings[i][0],variant:holdings[i][2],count}));
    if(spend){
      const outcome=fusionOutcome(spend.flatMap(part=>Array.from({length:part.count},()=>part)));
      steps.push({...group,fromVariant:group.variant,variant:outcome.variant,variantUpgrade:Boolean(outcome.variantUpgrade),to:outcome.rarity,spend,names:[...new Set(group.names)].sort()});
    }
  }
  return steps.sort((a,b)=>rarityStep(b.rarity)-rarityStep(a.rarity)||variantStep(b.variant)-variantStep(a.variant));
}
// A Fusion droid is fused at the quality you want or not at all, so the useful
// question on the Base is not just "can I make this" but "how good a one".
// ---- Fusing what you no longer need ---------------------------------------
const droidIncomeAt=(name,variant)=>fusionDroid(name)?.variants?.[variant]?.income||0;
// A roll does not say which droid arrives, so the middle earner of that rarity
// and quality is the honest guess at what one is worth.
function typicalIncomeFor(rarity,variant){
  const rows=state.droids.filter(d=>d.rarity===rarity&&!isIconic(d)&&d.variants?.[variant]?.income>0)
    .map(d=>d.variants[variant].income).sort((a,b)=>a-b);
  return rows.length?rows[Math.floor(rows.length/2)]:0;
}
// Copies you can spend without costing yourself a rebirth: everything of a droid
// the rest of the cycle never asks for, and the duplicates of one it does. The
// best copy of anything still wanted is held back, even when it is too low a
// quality yet, because that is the copy you would be upgrading.
function fusionSpareStock(){
  const wanted=new Set(futureRequirements().map(req=>req.droidName));
  const spare=new Map();
  for(const [name,byVariant] of fusionStock()){
    let held=!wanted.has(name);
    for(const [variant,count] of [...byVariant].sort((a,b)=>variantStep(b[0])-variantStep(a[0]))){
      let free=count;
      if(!held){free--;held=true}
      if(free>0){if(!spare.has(name))spare.set(name,new Map());spare.get(name).set(variant,free)}
    }
  }
  return spare;
}
// Ways to reach a droid the cycle still wants and you cannot field. A recipe or
// three of the droid itself is a certainty; three of the rarity below is a roll
// that could land on it, which is worth knowing before those three are sold.
function fusionRoutesToNeeded(){
  const spare=fusionSpareStock(),stock=fusionStock(),routes=[];
  const wanted=new Map();
  for(const req of futureRequirements()){
    if(hasRequirement(req))continue;
    const prev=wanted.get(req.droidName);
    if(!prev||variantStep(req.variant)>variantStep(prev.variant))wanted.set(req.droidName,req);
  }
  for(const [name,req] of wanted){
    const d=fusionDroid(name);
    if(!d||isIconic(d))continue;
    const at=req.variant;
    const recipe=fusionRecipes().find(entry=>entry.name===name);
    if(recipe){
      const best=fusionBestVariant(recipe,stock);
      if(best&&variantStep(best)>=variantStep(at))routes.push({name,at,rebirth:req.at,kind:'recipe',sure:true,inputs:recipe.inputs});
    }
    // The rarity below can roll the wanted droid; Mythics can also reroll.
    const rollFrom=RARITY_LADDER[rarityStep(d.rarity)-1];
    const below=VARIANTS[variantStep(at)-1];
    if(below&&(stock.get(name)?.get(below)||0)>=3)routes.push({name,at,rebirth:req.at,kind:'quality',sure:true,from:below});
    const under=rollFrom;
    if(under){
      const pool=[];
      let copies=0;
      for(const [other,byVariant] of spare){
        const od=fusionDroid(other);
        if(!od||isIconic(od)||od.rarity!==under)continue;
        const held=fusionCountFrom(byVariant,at);
        if(held>0){pool.push(other);copies+=held}
      }
      // Three of one droid only roll once the quality ladder has run out;
      // below that they would come back as that same droid a quality up.
      if(copies>=3&&(pool.length>1||!nextVariant(at)))
        routes.push({name,at,rebirth:req.at,kind:'roll',sure:false,pool:pool.sort(),rarity:d.rarity,from:under});
    }
  }
  return routes.sort((a,b)=>a.rebirth-b.rebirth||a.name.localeCompare(b.name)||(b.sure?1:0)-(a.sure?1:0));
}
// Spend the least good copies that still qualify, so a better one survives for
// whatever the next step wants.
function fusionSpendFrom(stock,name,variant,need){
  const byVariant=stock.get(name);
  if(!byVariant)return null;
  const floor=fusionPower(variant);
  const options=[...byVariant].filter(([held])=>fusionPower(held)>=floor).sort((a,b)=>fusionPower(a[0])-fusionPower(b[0]));
  const spend=[];
  let left=need;
  for(const [held,count] of options){
    if(left<=0)break;
    const use=Math.min(left,count);
    spend.push({name,variant:held,count:use});
    left-=use;
  }
  return left>0?null:spend;
}
// One fusion the pool could make right now. A result that fills a Droidex square
// wins outright: those cannot be bought back, while a better earner can. After
// that a certain result beats a roll, and then it is simply the bigger gain.
function fusionBestFrom(stock,floor,made,protocolFloors){
  const options=[];
  // Exact upgrade reserves may only enter their matching three-of-a-kind batch.
  // Filter before scoring so a blocked batch cannot hide another legal recipe.
  const mixedStock=new Map([...stock].map(([name,variants])=>[name,new Map([...variants].filter(([variant])=>!fusionReservedForUpgrade({name,variant}))) ]).filter(([,variants])=>variants.size));
  // A Protocol droid is worth making for the bonus it gives in a Protocol slot, not
  // for its credits, so it is measured against the weakest bonus slotted in each
  // role. A rarity roll names no droid, so it is judged as before.
  const protocolGain=(name,variant)=>{const pd=fusionDroid(name);if(!protocolFloors||pd?.type!=='PROTOCOL')return 0;return Math.max(protocolBonus(pd,variant,'CREDITS')-protocolFloors.CREDITS,protocolBonus(pd,variant,'CRAFTING')-protocolFloors.CRAFTING,0)};
  const usesMade=spend=>[...new Set(spend.map(part=>made.get(part.name+'|'+part.variant)).filter(i=>i!==undefined))];
  for(const recipe of fusionRecipes()){
    const selection=fusionRecipeSelection(recipe,mixedStock,false);
    if(!selection)continue;
    const {variant:at,spend}=selection;
    options.push({kind:'recipe',out:{name:recipe.name,variant:at},spend,sure:true,
      income:droidIncomeAt(recipe.name,at),fills:droidexGapFor(recipe.name,at),bonusGain:protocolGain(recipe.name,at),protocol:fusionDroid(recipe.name)?.type==='PROTOCOL',after:usesMade(spend)});
  }
  for(const step of fusionQualitySteps(stock)){
    const spend=[{name:step.name,variant:step.from,count:3}];
    options.push({kind:'quality',out:{name:step.name,variant:step.to},spend,sure:true,
      income:droidIncomeAt(step.name,step.to),fills:droidexGapFor(step.name,step.to),bonusGain:protocolGain(step.name,step.to),protocol:fusionDroid(step.name)?.type==='PROTOCOL',after:usesMade(spend)});
  }
  for(const group of fusionRaritySteps(mixedStock)){
    const spend=group.spend;
    // A roll does not say which droid arrives, so nothing goes back in the pool
    // and no Droidex square can be promised.
    options.push({kind:'rarity',out:null,rarity:group.to,variant:group.variant,fromVariant:group.fromVariant,variantUpgrade:group.variantUpgrade,from:group.rarity,pool:group.names,spend,sure:false,
      income:typicalIncomeFor(group.to,group.variant),fills:false,after:usesMade(spend)});
  }
  const preferences=normaliseFusionPreferences(state.fusionPreferences);
  const permitted=options.filter(option=>{
    const inputRarities=option.spend.map(part=>droidRarity(part.name));
    const hasMythic=inputRarities.includes('MYTHIC');
    if(hasMythic&&preferences.mythics==='off')return false;
    if(option.kind==='quality'&&option.spend.some(fusionReservedForUpgrade))return true;
    if(option.kind==='recipe'&&!preferences.recipes)return false;
    if(hasMythic){
      if(preferences.mythics==='reroll')return option.kind==='rarity'&&option.rarity==='MYTHIC';
      return option.kind!=='rarity'||option.variantUpgrade||option.variant==='KYBER';
    }
    if(preferences.goal==='rarity')return option.kind==='rarity'||option.kind==='recipe'&&rarityStep(droidRarity(option.out.name))>Math.max(...inputRarities.map(rarityStep));
    if(preferences.goal==='variant')return option.kind==='quality';
    return true;
  });
  // Fusion progress and the two spaces it frees are useful even when the
  // result will not replace an earner. Preferences still decide which kinds
  // are allowed; Droidex, bonuses and income rank those legal choices.
  const worth=permitted;
  if(!worth.length)return null;
  const rank=option=>(option.fills?1e12:0)+(option.sure?1e6:0)+(option.bonusGain>0?1e3*option.bonusGain:0)+(option.income-floor);
  return worth.sort((a,b)=>rank(b)-rank(a))[0];
}
const droidexGapFor=(name,variant)=>{const d=fusionDroid(name);return Boolean(d)&&!isIconic(d)&&!droidexEntry(name,variant)};
// What the Sell list could become instead of being sold. Every fusion takes
// three droids out of the pool and puts one back, so a later step can spend what
// an earlier one made - which is the whole point. Three spare Diamond Mythics
// are not just a Rainbow Mythic; they are the third Rainbow that two spare ones
// were waiting for, and together those are a Beskar.
function fusionChainFromSpares(spares,placed){
  const stock=new Map();
  const add=(name,variant,count=1)=>{if(!stock.has(name))stock.set(name,new Map());const byVariant=stock.get(name);byVariant.set(variant,(byVariant.get(variant)||0)+count)};
  const take=(name,variant,count=1)=>{const byVariant=stock.get(name);if(!byVariant)return;const left=(byVariant.get(variant)||0)-count;left>0?byVariant.set(variant,left):byVariant.delete(variant);if(!byVariant.size)stock.delete(name)};
  for(const unit of spares||[])add(unit.name,unit.variant||'DEFAULT',unit.source!==undefined&&unit.unit!==undefined?1:(Number(unit.qty)||1));
  if(!stock.size)return[];
  const earning=(placed||[]).filter(x=>PRODUCTIVE_STATIONS.includes(x.station)).map(x=>droidIncomeAt(x.name,x.variant));
  const slots=PRODUCTIVE_STATIONS.reduce((total,type)=>total+capacity(type),0);
  const floor=earning.length<slots?0:Math.min(...earning);
  // The weakest Protocol bonus slotted in each role. An empty Protocol slot is a
  // floor of zero, since any Protocol droid improves on nothing there.
  const hasProtocol=[...stock.keys()].some(name=>fusionDroid(name)?.type==='PROTOCOL');
  const protocolFloor=role=>{const values=Object.keys(PROTOCOL_SLOTS).filter(station=>PROTOCOL_SLOTS[station].role===role).map(station=>{const unit=(placed||[]).find(x=>x.station===station),pd=unit&&fusionDroid(unit.name);return pd?protocolBonus(pd,unit.variant,role):0});return values.length?Math.min(...values):0};
  const protocolFloors=hasProtocol?{CREDITS:protocolFloor('CREDITS'),CRAFTING:protocolFloor('CRAFTING')}:null;
  const steps=[],made=new Map();
  // Each round spends three copies and adds at most one known result. Stop
  // when no batch matches the player's fusion preferences.
  for(let round=0;round<12;round++){
    const pick=fusionBestFrom(stock,floor,made,protocolFloors);
    if(!pick)break;
    for(const part of pick.spend)take(part.name,part.variant,part.count);
    // Keep the promised named upgrade; never feed it straight into another roll.
    if(pick.out&&!pick.spend.some(fusionReservedForUpgrade)){add(pick.out.name,pick.out.variant);made.set(pick.out.name+'|'+pick.out.variant,steps.length)}
    steps.push({...pick,gain:pick.income-floor,step:steps.length+1});
  }
  return steps;
}
// The Fusion station on the Base, saying what the three in the slots are about
// to become while they can still be swapped out.
function fusionPreviewHtml(){
  const units=fusionSlotUnits();
  if(!units.length)return'';
  const held=units.map(unit=>`<span class="fusion-preview-in">${escapeAttr(unit.name)} ${variantText(unit.variant)}</span>`).join('');
  if(units.length<3)return `<div class="fusion-preview is-waiting"><span class="fusion-preview-inputs">${held}</span><em class="fusion-preview-out">Fill all three slots to see what they make.</em></div>`;
  const outcome=fusionOutcome(units);
  return `<div class="fusion-preview is-${outcome?.kind||'unknown'}"><span class="fusion-preview-inputs">${held}</span><span class="fusion-preview-out"><b>Makes</b> ${fusionOutcomeText(outcome)}</span></div>`;
}
// Expanding a ladder row. The names alone say which droids qualify but not
// which quality they are held at or where they are standing, and both decide
// whether spending them is actually free. `at` is the floor the row asks for,
// so only copies at that quality or better are worth showing.
function fusionPoolDetailHtml(names,at,label){
  if(!names.length)return'';
  const stock=fusionStock(),located=requirementLocations(),floor=variantStep(at);
  const cards=names.map(name=>{
    const d=fusionDroid(name);
    const held=[...(stock.get(name)||new Map())].filter(([variant])=>variantStep(variant)>=floor)
      .sort((a,b)=>variantStep(b[0])-variantStep(a[0]));
    const best=held[0]?.[0]||at;
    const where=[...new Set(held.map(([variant])=>located.get(`${name}:${variant}`)).filter(Boolean))];
    const counts=held.map(([variant,count])=>`${variantText(variant)}${count>1?` &times;${count}`:''}`).join(', ');
    return `<span class="fusion-pool-card">${picture(d,best)}<b>${escapeAttr(name)}</b><small>${counts||variantText(at)}</small><em>${where.length?where.join(' &middot; '):'Not placed'}</em></span>`;
  }).join('');
  return `<details class="fusion-pool"><summary>${label||`${names.length} droid${names.length===1?'':'s'} to choose from`}</summary><div class="fusion-pool-grid">${cards}</div></details>`;
}
function fusionOutlookHtml(){
  const all=fusionRecipes();
  if(!all.length)return'';
  const wanted=fusionWanted(),stock=fusionStock();
  const best=new Map(all.map(recipe=>[recipe.name,fusionBestVariant(recipe,stock)]));
  const tracked=all.filter(recipe=>wanted.has(recipe.name));
  const spare=all.filter(recipe=>!wanted.has(recipe.name)&&best.get(recipe.name));
  const quality=fusionQualitySteps(stock),rarity=fusionRaritySteps(stock),routes=fusionRoutesToNeeded();
  const recipeRow=recipe=>{
    const need=fusionNeed(recipe),at=best.get(recipe.name);
    const parts=need.parts.map(part=>`<span class="fusion-outlook-part ${part.short?'is-short':'is-held'}">${escapeAttr(part.name)} <em>${part.have}/${part.need}</em></span>`).join('');
    return `<li class="${at?'is-ready':''}"><a href="#/fusion-lab"><strong>${escapeAttr(recipe.name)}</strong></a> ${rarityText(recipe.rarity)}
      <span class="fusion-outlook-parts">${parts}</span>
      <em class="fusion-outlook-state">${at?`Ready &middot; best at ${variantText(at)}`:`Short ${need.missing.reduce((total,part)=>total+part.short,0)}`}</em></li>`;
  };
  const trackedBlock=tracked.length
    ?`<ul>${tracked.map(recipeRow).join('')}</ul>`
    :`<p class="fusion-outlook-empty">Nothing tracked yet. Pick the droids you are working towards in the <a href="#/fusion-lab">Fusion Lab</a> and what they still need shows up here.</p>`;
  const spareBlock=spare.length?`<div class="fusion-outlook-block"><h3>Also ready from what you hold</h3>
    <ul>${spare.map(recipeRow).join('')}</ul></div>`:'';
  const qualityBlock=quality.length?`<div class="fusion-outlook-block"><h3>Quality steps you could take</h3>
    <p>Three of one droid at one quality come out as that same droid, a quality higher. This is the one step where you know exactly what you get.</p>
    <ul class="fusion-ladder">${quality.map(step=>`<li><span class="fusion-ladder-spend">3 &times; <a href="#/droid/${slug(step.name)}"><strong>${escapeAttr(step.name)}</strong></a></span> ${rarityText(step.rarity)}
      <span class="fusion-ladder-step">${variantText(step.from)} <b>&rarr;</b> ${variantText(step.to)}</span>
      <em class="fusion-outlook-state">${step.have} held${step.sets>1?` &middot; ${step.sets} sets`:''}</em></li>`).join('')}</ul></div>`:'';
  const rarityBlock=rarity.length?`<div class="fusion-outlook-block"><h3>Random fusion results you could make</h3>
    <p>Three mixed-name droids sharing a rarity and a variant raise the rarity below Mythic. Mythics raise the variant instead: for example, Galactic inputs make a random Stellar Mythic. Named recipes take priority. Dormant Kyber Mythics stay dormant; matching Green or Blue Mythics advance one colour. Which droid you get is random. If the three you pick happen to be a recorded combination, that recipe wins instead and names its result.</p>
    <ul class="fusion-ladder">${rarity.map(group=>`<li><span class="fusion-ladder-step">${rarityText(group.rarity)} <b>&rarr;</b> ${rarityText(group.to)}</span> at ${variantText(group.variant)}
      <span class="fusion-outlook-parts">${group.names.map(name=>`<span class="fusion-outlook-part is-held">${escapeAttr(name)}</span>`).join('')}</span>
      <em class="fusion-outlook-state">${group.copies} held · a batch of three available</em>${fusionPoolDetailHtml(group.names,group.fromVariant)}</li>`).join('')}</ul></div>`:'';
  const routeBlock=routes.length?`<div class="fusion-outlook-block"><h3>Fusion routes to a droid you still need</h3>
    <p>Rebirth wants these and you cannot field them. Spending droids the rest of the cycle never asks for is free; a roll is not a promise, but it is better than selling the three.</p>
    <ul class="fusion-ladder">${routes.map(route=>`<li class="${route.sure?'is-ready':''}"><a href="#/droid/${slug(route.name)}"><strong>${escapeAttr(route.name)}</strong></a> ${variantText(route.at)}
      <span class="fusion-outlook-parts">${route.kind==='recipe'?`<span class="fusion-outlook-part is-held">fuse ${route.inputs.map(escapeAttr).join(' + ')}</span>`
        :route.kind==='quality'?`<span class="fusion-outlook-part is-held">fuse 3 &times; ${escapeAttr(route.name)} at ${variantLabel(route.from)}</span>`
        :`<span class="fusion-outlook-part is-held">roll 3 spare ${rarityLabel(route.from)}s at ${variantLabel(route.at)} or better</span>${route.pool.map(name=>`<span class="fusion-outlook-part is-held">${escapeAttr(name)}</span>`).join('')}`}</span>
      <em class="fusion-outlook-state">R${route.rebirth} &middot; ${route.sure?'certain':'a roll'}</em>${fusionPoolDetailHtml(route.kind==='recipe'?route.inputs:route.kind==='quality'?[route.name]:route.pool,route.kind==='quality'?route.from:route.at,route.kind==='recipe'?'What it takes':route.kind==='quality'?'What it takes':'')}</li>`).join('')}</ul></div>`:'';
  const ready=all.filter(recipe=>best.get(recipe.name)).length;
  return `<section class="fusion-outlook"><header><div><p class="eyebrow">Droid Fusion</p><h2>Fusion Outlook</h2>
    <p>What your base could fuse right now. A Fusion droid comes out at the worst quality that went in and cannot be upgraded afterwards, so the quality shown is the best you could manage today. <a href="#/fusion-lab">How fusion works</a>.</p></div>
    <span class="fusion-outlook-count">${ready}/${all.length} ready</span></header>
    ${trackedBlock}${routeBlock}${spareBlock}${qualityBlock}${rarityBlock}</section>`;
}

// "My fusions": only the Fusion droids your own droids lead to. For each one,
// which of your copies would go in (and where they stand), what is still
// missing, and what comes out. A copy a rebirth still needs is marked, because
// fusing spends it.
function fusionMineRows(){
  const held=fusionStock(),needed=fusionRebirthProtectedKeys();
  const units=expandedOwned().map(unit=>({...unit,key:`${unit.source}:${unit.unit}`}));
  return fusionRecipes().map(recipe=>{
    const need=fusionNeed(recipe);
    if(!need.parts.some(part=>part.have>0))return null;
    const d=fusionDroid(recipe.name);
    const parts=need.parts.map(part=>{
      // A copy no rebirth needs goes in before one that a rebirth does, and the
      // better quality first: the result comes out at the worst that goes in.
      const copies=units.filter(unit=>unit.name===part.name).sort((a,b)=>Number(needed.has(a.key))-Number(needed.has(b.key))||variantRank(b.variant)-variantRank(a.variant));
      return{...part,use:copies.slice(0,part.need),spare:Math.max(0,copies.length-part.need)};
    });
    // The quality shown is the one these exact copies would make.
    const at=need.ready?VARIANTS[Math.min(...parts.flatMap(part=>part.use.map(unit=>variantRank(unit.variant))))]:'';
    return{recipe,need,at,parts,income:at&&d?droidIncomeAt(recipe.name,at):0,owned:fusionOwnedCount(recipe.name),held:need.parts.reduce((total,part)=>total+Math.min(part.have,part.need),0),needed};
  }).filter(Boolean).sort((a,b)=>Number(b.need.ready)-Number(a.need.ready)||b.held-a.held||b.income-a.income||a.recipe.name.localeCompare(b.recipe.name));
}
function fusionMineHtml(){
  const rows=fusionMineRows();
  if(!rows.length)return'<p class="fusion-mine-empty">None of the droids on your Base is an ingredient for a Fusion droid yet. The <a href="#/fusion-lab">Fusion Lab</a> lists every recipe.</p>';
  const where=unit=>unit.preferred?`${stationName(unit.preferred)} ${Number(unit.preferredSlot)+1}`:'Roster';
  const row=item=>{
    const parts=item.parts.map(part=>{
      const mine=part.use.map(unit=>`<li>${variantText(unit.variant)} <small>${escapeAttr(where(unit))}${item.needed.has(unit.key)?' · <b class="fusion-mine-warn">needed for a rebirth</b>':''}</small></li>`).join('');
      const missing=part.short?`<li class="is-missing">Need ${part.short} more</li>`:'';
      return `<div class="fusion-mine-part ${part.short?'is-short':'is-held'}"><strong>${part.need>1?`${part.need} × `:''}${escapeAttr(part.name)}</strong><em>${part.have} of ${part.need}</em><ul>${mine}${missing}</ul></div>`;
    }).join('');
    const d=fusionDroid(item.recipe.name);
    const result=item.need.ready
      ?`Makes <b>${escapeAttr(item.recipe.name)}</b> at ${variantText(item.at)} · ${fmt(item.income)}/s`
      :`Makes <b>${escapeAttr(item.recipe.name)}</b> · still need ${item.need.missing.map(part=>`${part.short} × ${escapeAttr(part.name)}`).join(', ')}`;
    return `<article class="fusion-mine-row ${item.need.ready?'is-ready':''}"><header><a href="#/droid/${slug(item.recipe.name)}">${d?picture(d,item.at||'DEFAULT'):''}</a><div><p>${result}</p><small>${rarityText(item.recipe.rarity)} ${escapeAttr(String(item.recipe.type||'').toLowerCase())} droid${item.owned?` · you already own ${item.owned}`:''}</small></div></header><div class="fusion-mine-parts">${parts}</div></article>`;
  };
  const ready=rows.filter(item=>item.need.ready),partial=rows.filter(item=>!item.need.ready);
  return `${ready.length?`<h3>Ready to fuse now <span>${ready.length}</span></h3>${ready.map(row).join('')}`:''}${partial.length?`<h3>You have some of the droids <span>${partial.length}</span></h3>${partial.map(row).join('')}`:''}`;
}
function showFusionMineModal(){
  const root=document.querySelector('#modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><section class="modal fusion-mine-modal" role="dialog" aria-modal="true"><p class="eyebrow">Fusion</p><h2>My fusions</h2><p class="picker-hint">The Fusion droids your own droids can make. Three go in and they are spent; named recipes use the lowest fusion strength among their inputs. Scourge and Stellar have equal fusion strength; Kyber colours are averaged.</p><div class="fusion-mine-list">${fusionMineHtml()}</div><div class="modal-actions"><a class="btn secondary" href="#/fusion-lab" id="fusionMineLab">All recipes</a><button class="btn ghost" id="fusionMineClose">Close</button></div></section></div>`;
  const close=()=>{root.innerHTML=''};
  root.querySelector('#fusionMineClose').onclick=close;root.querySelector('#fusionMineLab').onclick=close;
  root.querySelector('.modal-backdrop').onclick=event=>{if(event.target===event.currentTarget)close()};
  root.querySelectorAll('.fusion-mine-list a').forEach(link=>link.addEventListener('click',close));
}
function fusionLabPage(){
  const recipes=fusionRecipes();
  const wanted=fusionWanted();
  const held=fusionStock();
  const rows=recipes.map(recipe=>{
    const need=fusionNeed(recipe);
    // Holding the three is only half of it: which quality they are decides
    // which quality the result is stuck at for good.
    const at=fusionBestVariant(recipe,held);
    const stock=new Map(need.parts.map(part=>[part.name,part]));
    const seen=new Map();
    const inputs=recipe.inputs.map((input,index)=>{
      // Two of the same droid share one entry, so the count shown is the pair's.
      seen.set(input,(seen.get(input)||0)+1);
      return `${index?'<span class="fusion-plus" aria-hidden="true">+</span>':''}${fusionCardHtml(input,'input',stock.get(input))}`;
    }).join('');
    const short=need.missing.map(part=>`${escapeAttr(part.name)} x${part.short}`).join(', ');
    const isWanted=wanted.has(recipe.name);
    return `<article class="fusion-row ${need.ready?'fusion-ready':''} ${isWanted?'fusion-wanted':''} ${need.parts.some(part=>part.have>0)?'fusion-mine':''}" data-fusion-row="${escapeAttr(recipe.name)}">
      <div class="fusion-inputs">${inputs}</div>
      <span class="fusion-equals" aria-hidden="true">=</span>
      <div class="fusion-result">${fusionCardHtml(recipe.name,'result')}
        <div class="fusion-state">${at?`<em class="fusion-have">Ready to fuse &middot; best at ${variantText(at)}</em>`:`<em class="fusion-short">Need ${short}</em>`}
        <button class="btn secondary fusion-track" type="button" data-fusion-want="${escapeAttr(recipe.name)}">${isWanted?'Tracking':'Track'}</button></div>
      </div>
    </article>`;
  }).join('');
  const ready=recipes.filter(recipe=>fusionNeed(recipe).ready).length;
  const log=fusionLogSummary();
  const logHtml=log.length?`<section class="fusion-log"><header><div><p class="eyebrow">Recorded</p><h2>What came out</h2><p>Every fusion you have run, and what it produced. Combinations with no known recipe are the ones worth adding to.</p></div><span class="fusion-outlook-count">${log.reduce((total,row)=>total+row.total,0)} fused</span></header><ul>${log.map(row=>`<li><span class="fusion-log-inputs">${row.inputs.map(input=>escapeAttr(input.name)).join(' + ')}</span><span class="fusion-log-results">${row.results.map(([label,count])=>`<em>${escapeAttr(label)}${count>1?` x${count}`:''}</em>`).join(' ')}</span></li>`).join('')}</ul></section>`:'';
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Fusion Lab</div>
    <section class="dex-hero"><div><p class="eyebrow">Droid Fusion</p><h1>Fusion Lab</h1><p>Three droids go into the Fusion room and one comes out. Track the ones you are working towards and they appear in the Fusion Outlook on your Base.</p><p>Named recipes also work with Kyber colours and Scourge. Scourge has the same fusion strength as Stellar. If you mix those two, the first input of that strength decides the result: put Scourge in the first Fusion slot to keep Scourge. All-Kyber recipes average the activation colours. Three Scourge droids of one rarity can roll the next rarity while staying Scourge; this does not provide a Mythic Scourge reroll.</p></div>
      <div class="dex-totals"><strong>${ready}/${recipes.length}</strong><span>ready to fuse</span></div></section>
    <div class="dex-toolbar"><input id="fusionSearch" class="form-control" placeholder="Search a droid or a result…">
      <div class="dex-filters"><label class="dex-switch"><input id="fusionReadyOnly" type="checkbox"><span class="dex-switch-track" aria-hidden="true"></span><span>Ready only</span></label>
      <label class="dex-switch"><input id="fusionTrackedOnly" type="checkbox"><span class="dex-switch-track" aria-hidden="true"></span><span>Tracked only</span></label>
      <label class="dex-switch"><input id="fusionMineOnly" type="checkbox"><span class="dex-switch-track" aria-hidden="true"></span><span>My droids only</span></label>
      <button class="btn secondary" type="button" id="fusionMineOpen">My fusions</button></div>
      <span id="fusionCount">${recipes.length} shown</span></div>
<section class="fusion-rules"><header><p class="eyebrow">The ladder</p><h2>How fusion works</h2></header>
      <ol>
        <li><b>Three go in, one comes out.</b> The three are spent whatever the result is.</li>
        <li><b>The quality that comes out is the worst that went in.</b> Two Stellar and a Rainbow make a Rainbow, not a Stellar.</li>
        <li><b>A Fusion droid cannot be upgraded afterwards</b> the way an ordinary droid can. The quality you fuse it at is the quality it stays, so fuse it at the one you actually want.</li>
        <li><b>Three of the same droid at the same quality</b> come out as that same droid, one quality higher — three Gold R6 make a Diamond R6.</li>
        <li><b>Three droids that are not the same but share a rarity</b> come out one rarity higher, at the worst quality that went in — three different Epics at Beskar make a Legendary at Beskar.</li>
        <li><b>Three mixed-name Mythics reroll into a Mythic</b> at the lowest variant of the inputs. Three identical Mythics still upgrade their variant, or reroll if already at the top quality.</li>
        <li><b>Otherwise the droid is a roll.</b> Three of one droid hand that droid back, but where the three are not the same the fusion settles the rarity and the quality and nothing else — which droid of that rarity arrives is chance.</li>
        <li><b>A recorded combination below beats the ladder.</b> Those are the ones that make the Fusion droids: the three N-UL wants are all Epic, and they make N-UL, which is itself an Epic rather than a Legendary.</li>
      </ol>
      <p class="fusion-rules-note">Anything not covered here has not been recorded yet. Fusing it asks what came out and adds it to the log at the foot of this page.</p></section>
    <div class="fusion-list" id="fusionList">${rows||'<div class="empty">No fusion recipes are loaded.</div>'}</div>${logHtml}`;
  const search=document.querySelector('#fusionSearch'),readyOnly=document.querySelector('#fusionReadyOnly'),trackedOnly=document.querySelector('#fusionTrackedOnly');
  document.querySelector('#fusionMineOpen').onclick=showFusionMineModal;
  const draw=()=>{
    const query=search.value.toLowerCase().trim();
    let shown=0;
    document.querySelectorAll('.fusion-row').forEach(row=>{
      const match=(!query||row.textContent.toLowerCase().includes(query))
        &&(!readyOnly.checked||row.classList.contains('fusion-ready'))
        &&(!document.querySelector('#fusionMineOnly').checked||row.classList.contains('fusion-mine'))
        &&(!trackedOnly.checked||row.classList.contains('fusion-wanted'));
      row.hidden=!match;
      if(match)shown++;
    });
    document.querySelector('#fusionCount').textContent=`${shown} shown`;
  };
  search.oninput=draw;readyOnly.onchange=draw;trackedOnly.onchange=draw;document.querySelector('#fusionMineOnly').onchange=draw;
  document.querySelectorAll('[data-fusion-want]').forEach(button=>button.onclick=()=>{
    const on=toggleFusionWanted(button.dataset.fusionWant);
    button.textContent=on?'Tracking':'Track';
    button.closest('.fusion-row')?.classList.toggle('fusion-wanted',on);
    draw();
  });
}
function droidexPage(){let variant='DEFAULT',missingOnly=localStorage.getItem('droid-archive-dex-missing-only')==='1',nonFlawlessOnly=localStorage.getItem('droid-archive-dex-non-flawless-only')==='1';const render=()=>{const available=state.droids.filter(d=>variant==='DEFAULT'||!onlyDefaultVariant(d)),collected=state.droidex.filter(x=>x.variant===variant).length,flawless=flawlessCount();app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Droidex</div><section class="dex-hero"><div><p class="eyebrow">Collection tracker</p><h1>Droidex</h1><p>Collect every droid quality and mark your flawless finds.</p></div><div class="dex-totals"><strong>${state.droidex.length}/${droidexCapacity()}</strong><span>✦ ${flawless}/${flawlessCapacity()} flawless tracked</span><button class="btn secondary" id="transferDroidex">⇄ Import / Export</button></div></section><div class="variant-tabs dex-tabs">${DISPLAY_VARIANTS.map(v=>`<button data-dex-variant="${v}" class="${v===variant?'active':''}">${variantText(v)}</button>`).join('')}</div><div class="dex-toolbar"><input id="dexSearch" class="form-control" placeholder="Search Droidex…"><div class="dex-filters"><label class="dex-switch"><input id="dexMissing" type="checkbox" ${missingOnly?'checked':''}><span class="dex-switch-track" aria-hidden="true"></span><span>Missing only</span></label><label class="dex-switch"><input id="dexNonFlawless" type="checkbox" ${nonFlawlessOnly?'checked':''}><span class="dex-switch-track" aria-hidden="true"></span><span>Non-flawless only</span></label></div><span>${collected}/${available.length} ${variantText(variant)} collected</span></div><div id="dexGrid" class="dex-grid"></div><section id="dexUpcoming" class="upcoming-droids-section"></section>`;const draw=()=>{const q=document.querySelector('#dexSearch').value.toLowerCase();const list=available.filter(d=>d.name.toLowerCase().includes(q)&&(!missingOnly||!droidexEntry(d.name,variant))&&(!nonFlawlessOnly||(!isIconic(d)&&!isDroidFlawless(d.name))));document.querySelector('#dexGrid').innerHTML=list.length?list.map(d=>{const entry=droidexEntry(d.name,variant),flawless=isDroidFlawless(d.name);return `<article class="dex-card ${entry?'collected':'missing'} ${flawless?'flawless':''}"><a href="#/droid/${slug(d.name)}">${picture(d,variant)}${rarityBadge(d.rarity)}<strong>${d.name}</strong></a><div><button class="dex-own" data-dex-own="${d.name}">${entry?'✓ Owned':'+ Add'}</button><button class="dex-flawless" data-dex-flawless="${d.name}" ${entry&&!isIconic(d)?'':'disabled'}>✦ ${flawless?'Flawless':'Flawless?'}</button></div></article>`}).join(''):'<p class="dex-empty">No droids match the active filters.</p>';const upcoming=COMING_SOON_DROIDS.filter(d=>d.variants.includes(variant)&&d.name.toLowerCase().includes(q));document.querySelector('#dexUpcoming').innerHTML=upcoming.length?`<h2>Coming soon</h2><p>Preview the announced droids. Collection tracking unlocks when their details are available.</p><div class="droid-grid">${upcoming.map(d=>comingSoonCard(d,variantText,variant)).join('')}</div>`:'';document.querySelectorAll('[data-dex-own]').forEach(b=>b.onclick=()=>{toggleDroidex(b.dataset.dexOwn,variant);render()});document.querySelectorAll('[data-dex-flawless]').forEach(b=>b.onclick=()=>{toggleFlawless(b.dataset.dexFlawless,variant);render()})};document.querySelectorAll('[data-dex-variant]').forEach(b=>b.onclick=()=>{variant=b.dataset.dexVariant;render()});document.querySelector('#transferDroidex').onclick=()=>showDroidexTransferModal(render);document.querySelector('#dexSearch').oninput=draw;document.querySelector('#dexMissing').onchange=e=>{missingOnly=e.target.checked;localStorage.setItem('droid-archive-dex-missing-only',missingOnly?'1':'0');draw()};document.querySelector('#dexNonFlawless').onchange=e=>{nonFlawlessOnly=e.target.checked;localStorage.setItem('droid-archive-dex-non-flawless-only',nonFlawlessOnly?'1':'0');draw()};draw()};render()}
function home(){archiveExperience.home()}
const novaUpgrade=id=>state.novaShop?.upgrades?.find(x=>x.id===id);
const cantinaPack=id=>state.cantinaShop?.items?.find(item=>item.id===id&&item.category==='packs');
const ownedCantinaPacks=()=>Object.entries(state.cantinaPurchases||{}).filter(([,owned])=>owned).map(([id])=>cantinaPack(id)).filter(Boolean);
const minimumNovaLevel=id=>ownedCantinaPacks().reduce((minimum,pack)=>Math.max(minimum,(pack.novaUnlocks||[]).includes(id)?1:0,Math.max(0,Math.floor(Number(pack.novaLevels?.[id])||0))),0);
function syncCantinaPackUpgrades(){
  state.cantinaPurchases=state.cantinaPurchases&&typeof state.cantinaPurchases==='object'?state.cantinaPurchases:{};
  state.cantinaPackGrants=state.cantinaPackGrants&&typeof state.cantinaPackGrants==='object'?state.cantinaPackGrants:{};
  for(const pack of ownedCantinaPacks()){
    for(const id of pack.novaUnlocks||[])state.novaUpgrades[id]=Math.max(1,novaLevelFor(id));
    for(const [id,level] of Object.entries(pack.novaLevels||{}))state.novaUpgrades[id]=Math.max(Math.max(0,Math.floor(Number(level)||0)),novaLevelFor(id));
    if(pack.novaLevelGrants&&!state.cantinaPackGrants[pack.id]){
      for(const [id,count] of Object.entries(pack.novaLevelGrants)){
        const upgrade=novaUpgrade(id);if(!upgrade)continue;
        state.novaUpgrades[id]=Math.min(upgrade.uncapped?Infinity:upgrade.levels.length,novaLevelFor(id)+Math.max(0,Math.floor(Number(count)||0)));
        if(id==='lounge-slot')state.loungePurchased=state.novaUpgrades[id];
      }
      state.cantinaPackGrants[pack.id]=true;
    }
  }
}
const novaCost=(level=0)=>level?.cost===null||level?.unknown?'<span class="unknown-cost">Cost unknown</span>':`<img src="${state.novaShop?.currency?.icon||'assets/events/nova-crystal.png'}" alt=""> ${fmt(level.cost)}`;
function partyControlsHtml(){
  const party=normaliseParty(state.party),bonus=partyBonuses(party);
  const options=(count,selected,start=0)=>Array.from({length:count},(_,i)=>i+start).map(n=>`<option value="${n}" ${n===selected?'selected':''}>${n===1&&start===1?'1 (solo)':n}</option>`).join('');
  return `<section id="partyBonusesPanel" class="party-settings${localStorage.getItem('droid-archive-party-collapsed')==='1'?' collapsed':''}" aria-label="Party bonuses"><div><h2>Party bonuses</h2><p>Count party members currently in the game, including you. Maximum 6 people.</p></div><div class="party-fields">
    <label>People in your party<select class="form-control" data-party-setting="size">${options(6,party.size,1)}</select><small>+${Math.round((bonus.chips-1)*100)}% Upgrade Chips &middot; maximum +100%</small></label>
    <label>Pickaxe target<select class="form-control" data-party-setting="target"><option value="depot" ${party.target==='depot'?'selected':''}>Droid Depot</option><option value="fusion" ${party.target==='fusion'?'selected':''}>Fusion</option></select><small>Party pickaxe bonus applies to Droid Depots.</small></label>
    <label>Others hitting this depot<select class="form-control" data-party-setting="depotHitters" ${party.size===1||party.target==='fusion'?'disabled':''}>${options(party.size,party.depotHitters)}</select><small>+${Math.round((bonus.pickaxe-1)*100)}% pickaxe &middot; count active hitters only</small></label>
    <label class="party-scrap"><span><input type="checkbox" data-party-setting="scrapAtPartyBase" ${party.scrapAtPartyBase?'checked':''} ${party.size===1?'disabled':''}> Hitting a party member's Scrap Station</span><small>${bonus.scrap>1?'+50% scrap credits':'No scrap credit bonus at your own station'}</small></label>
  </div><p class="party-help">Chip rewards include your party bonus. Depot helpers boost pickaxe hits, not passive crafting or Base income. Scrap estimates use your recorded income and the station level entered.</p></section>`;
}
function partyToggleButtonHtml(){
  const collapsed=localStorage.getItem('droid-archive-party-collapsed')==='1';
  return `<button type="button" id="togglePartyPanel" class="btn secondary base-panel-toggle ${collapsed?'':'active'}" data-party-panel-toggle aria-controls="partyBonusesPanel" aria-expanded="${!collapsed}" title="${collapsed?'Show':'Hide'} Party bonuses">${commandIcon('party')}${collapsed?'Show':'Hide'} Party bonuses</button>`;
}
document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-party-panel-toggle]');if(!button)return;
  const panel=document.querySelector('#partyBonusesPanel');if(!panel)return;
  const collapsed=panel.classList.toggle('collapsed');
  localStorage.setItem('droid-archive-party-collapsed',collapsed?'1':'0');
  button.outerHTML=partyToggleButtonHtml();
});
document.addEventListener('change',event=>{
  const input=event.target.closest?.('[data-party-setting]');if(!input)return;
  state.party=normaliseParty({...normaliseParty(state.party),[input.dataset.partySetting]:input.type==='checkbox'?input.checked:input.value});
  save();route();
});
function scrapSeconds(){const config=state.novaShop?.calculators?.scrap,upgrade=novaUpgrade(config?.upgradeId||'scrap-value'),level=novaLevelFor(config?.upgradeId||'scrap-value');if(!upgrade||!level)return 0;const configured=Number(upgrade.levels?.[level-1]?.scrapSeconds);if(Number.isFinite(configured)&&configured>0)return configured;const perLevel=Number(upgrade.rewardPerLevel);if(Number.isFinite(perLevel)&&perLevel>0)return level*perLevel;return Number(config?.defaultSeconds??1)}
// Optional, session-only estimate: leaving this blank avoids tracking station levels.
let scrapStationLevel=null;
const scrapActivity={quality:'default',swings:null,cycleSeconds:null,pickaxe:null};
function scrapActivityHtml(placed,income){
  const {quality,cycleSeconds}=scrapActivity,ownLevel=scrapActivity.pickaxe??Math.max(0,critSetting('pickaxe',pickaxeMasteryLevels())),companions=companionAstromechBonus(placed),progress=scrapProgress(ownLevel,companions);
  const calculated=scrapStationLevel===null?null:Math.ceil((SCRAP_QUALITIES[quality].health+2*scrapStationLevel)/progress);
  const swings=scrapActivity.swings??calculated,rewards=scrapPayoutsForIncome(income,quality),estimate=scrapSeconds()||scrapStationLevel!==null?scrapActiveEstimate({rewards,swings,cycleSeconds}):null;
  return `<details class="scrap-activity"><summary>Active scrap earnings per second</summary><p>Time several scraps of the selected quality, including the wait for the next scrap, then enter the average seconds per scrap. These are active earnings, separate from passive Base income.</p><div class="protocol-summary-grid"><label>Scrap quality<select class="form-control" data-scrap-activity="quality">${Object.keys(SCRAP_QUALITIES).map(q=>`<option value="${q}" ${q===quality?'selected':''}>${q[0].toUpperCase()+q.slice(1)}</option>`).join('')}</select></label><label>Average seconds per scrap, including replacement<input class="form-control" type="number" min="0.01" step="any" data-scrap-activity="cycleSeconds" value="${cycleSeconds??''}" placeholder="Measured in game"></label><label>Swings per scrap (optional with station level)<input class="form-control" type="number" min="1" step="1" data-scrap-activity="swings" value="${scrapActivity.swings??''}" placeholder="${calculated??'Count in game'}"></label><label>Your own pickaxe level, before companions<input class="form-control" type="number" min="0" step="1" data-scrap-activity="pickaxe" value="${ownLevel}"></label></div><p>${companions} pickaxe progress from equipped Astromech companions; ${progress} total progress per swing (1 + twice your own level + companion bonuses). ${calculated?`Station level predicts ${calculated} swings for this quality.`:'Enter observed swings to estimate earnings without tracking the station level.'} Pickaxe Mastery is only the starting level after a Super Rebirth; set your current level above. Crafting critical-hit bonuses are not applied to scrap.</p>${estimate?`<p><strong>${fmt(estimate.perSecond)}/s active scrap</strong> &middot; ${fmt(estimate.credits)} per scrap &middot; ${fmt(estimate.perSecond+income)}/s including passive income.</p><small>(${swings-1} normal hits &times; ${fmt(rewards.hit)} + ${fmt(rewards.break)} breaking reward) / ${cycleSeconds} seconds. ${scrapStationLevel===null?'Income-based estimate; the station minimum may pay more.':''}</small>`:'<p>Enter seconds and swings per scrap (or a station level) to calculate active earnings. Without Scrap Value, a station level is also needed for the reward.</p>'}<p><small>Measurements and optional levels last until reload. Changing quality clears the timing and swing sample. Use a fresh sample after changing your setup.</small></p></details>`;
}
function scrapPayoutsForIncome(income,quality='default',placed=placements().placed){
  return scrapRewards({income,seconds:scrapSeconds(),quality:String(quality).toLowerCase(),stationLevel:scrapStationLevel,partyMultiplier:partyBonuses(state.party).scrap*(1+traitSum(placed,7))});
}
function scrapCalculatorHtml(placed){
  const config=state.novaShop?.calculators?.scrap;if(!config)return'';
  const income=scrapIncomeForPlaced(placed),seconds=scrapSeconds(),level=novaLevelFor(config.upgradeId),drops=config.drops||[],known=scrapStationLevel!==null;
  return `<section class="scrap-calculator"><div><p class="eyebrow">Workshop calculator</p><h2>${config.title||'Scrap calculator'}</h2><p>${config.description||''}</p><small>Scrap Value level ${level} &middot; ${seconds} second${seconds===1?'':'s'} of current Base generation &middot; Scrap base ${fmt(income)}/s</small><p>${known?'Payouts include the minimum reward for the station level entered.':seconds?'Income-based payout; your station&#39;s minimum reward may be higher.':'Without Scrap Value, rewards depend on your scrap station level. Enter it below to estimate payouts.'}</p><details${known?' open':''}><summary>Advanced: scrap station level (optional)</summary><label>Station level <input class="form-control" data-scrap-station-level type="number" min="0" step="1" placeholder="Not set" value="${known?scrapStationLevel:''}"></label><small>Leave blank to use income-based payouts. This estimate lasts until you reload; it does not update your save.</small></details></div><table><thead><tr><th>Scrap</th>${drops.map(drop=>`<th>${drop.name}</th>`).join('')}</tr></thead><tbody>${(config.qualities||[]).map(row=>{const payouts=scrapPayoutsForIncome(income,row.id||row.name);return `<tr><th>${row.name}</th>${drops.map(drop=>`<td>${seconds||known?fmt(payouts[drop.id||String(drop.name).toLowerCase()]):'Station level needed'}</td>`).join('')}</tr>`}).join('')}</tbody></table>${scrapActivityHtml(placed,income)}</section>`;
}
// Upgrading a droid in place fills the Droidex, so completing an entry never
// needs a spare copy — it needs the copy you already own kept alive. A droid is
// worth keeping when its name still has unrecorded qualities at or above its
// current one, since those are the only ones it can still reach.
// Companion slots exist to be swapped, so Optimise keeps them stocked with the
// best boost of each kind you asked for. The numbers mirror droidAttribute:
// Astromech gives pickaxe levels, Worker crafting speed, Battle max health.
const COMPANION_GOALS=[{id:'pickaxe',type:'ASTROMECH',label:'Highest pickaxe level',short:'Pickaxe'},{id:'crafting',type:'WORKER',label:'Highest craft speed',short:'Craft speed'},{id:'health',type:'BATTLE',label:'Highest max health',short:'Max health'},{id:'credits',type:'PROTOCOL',label:'Highest credit multiplier',short:'Credits'}];
const companionGoals=()=>{const chosen=Array.isArray(state.companionGoals)?state.companionGoals.filter(id=>COMPANION_GOALS.some(g=>g.id===id)):null;return chosen&&chosen.length?chosen:['pickaxe','crafting','health']};
// Capped at the number of Companion slots actually unlocked. Anything beyond
// that stays in the save but is not shown or used, so it comes back if you
// later unlock the second slot rather than being thrown away.
const preferredCompanions=()=>Array.isArray(state.preferredCompanions)?state.preferredCompanions.filter(name=>state.droids.some(d=>d.name===name&&isIconic(d))).slice(0,companionSlotCount()):[];
const iconicDroids=()=>state.droids.filter(isIconic);
function droidAttributeValue(d,variant){return companionAttributeValue(d,variant)}
// Preferred Iconics you do not own yet, so Optimise can tell you to go buy them.
const missingPreferredCompanions=()=>{const owned=new Set(state.owned.map(x=>x.name));return preferredCompanions().filter(name=>!owned.has(name))};
// There is no point naming more preferred companions than you have slots to put
// them in, so the picker stops at however many are actually unlocked.
const companionSlotCount=()=>stationSlotIndices('COMPANION').length;
// What you are doing right now decides who should walk with you. Each activity
// names the Iconics to take first, in order, and the perk to fill any seat left
// with. It is a mode for this sitting, kept in this browser rather than the profile.
const COMPANION_ACTIVITIES={
  scrap:{label:'Scrap farming',prefer:[],goal:'credits',why:'the Protocol droids worth more beside you than in a Credits slot'},
  crafting:{label:'Crafting',prefer:['CHOPPER'],goal:'pickaxe',why:'CHOPPER and the best pickaxe level'},
  combat:{label:'Combat',missions:true,prefer:['DJ R-3X','MISTER BONES'],goal:'health',why:'the DJ R-3X perk, then MISTER BONES or the best max health'},
  mining:{label:'Mining',missions:true,prefer:['DJ R-3X','CHOPPER'],goal:'pickaxe',why:'the DJ R-3X perk, then CHOPPER or the best pickaxe level'},
  fishing:{label:'Fishing',missions:true,prefer:['DJ R-3X','BB-8'],goal:null,why:'the DJ R-3X and BB-8 perks'}
};
const COMPANION_ACTIVITY_KEY='droid-archive-companion-activity';
const companionActivity=()=>{try{const id=localStorage.getItem(COMPANION_ACTIVITY_KEY);return COMPANION_ACTIVITIES[id]?id:null}catch{return null}};
const setCompanionActivity=id=>{try{COMPANION_ACTIVITIES[id]?localStorage.setItem(COMPANION_ACTIVITY_KEY,id):localStorage.removeItem(COMPANION_ACTIVITY_KEY)}catch{}};
// Who the active activity puts in which Companion seat. Every droid you own is a
// candidate, working or not: the point of the mode is the best perk, and the
// rest of the base is planned around it. A locked or still-building droid stays
// put, so a locked Companion keeps its seat and counts if the activity wants it.
// A Protocol droid has two ways to raise what scrap pays, and scrap pays in
// seconds of the base's credits. As a Companion its Credit Multiplier joins the
// base multiplier: measured in game, 453.84B with nobody, 532.98B with 1600%,
// 542.87B with 1800% and 622.01B with both, so every 100% adds the same amount
// and two Companions simply add up; credits scale with (multiplier + % / 100). In
// a Protocol Credits slot it multiplies one region's credits instead. Which job
// is worth more depends on the multiplier and on how much that region earns, so
// every way of seating up to `seats` of them is tried, with the rest put in the
// open Credits slots where they help most, and the split that earns most wins.
function scrapCompanionChoice(p,units,seats){
  const keyOf=x=>`${x.source}:${x.unit}`,multiplier=Math.max(1e-9,Number(effectiveMultiplier())||1),regions=regionalIncome(p.placed);
  const fixedSlot=region=>p.placed.find(x=>x.station===`PROTOCOL_${region}_CREDITS`&&(x.lockedSlot||isBuilding(x)));
  const open=PROTOCOL_REGIONS.filter(region=>stationSlotIndices(`PROTOCOL_${region}_CREDITS`).length&&!fixedSlot(region)).sort((a,b)=>regions[b].beforeBonus-regions[a].beforeBonus);
  const pool=units.map(unit=>({unit,droid:state.droids.find(d=>d.name===unit.name)})).filter(x=>x.droid?.type==='PROTOCOL')
    .map(x=>({...x,seat:unitCompanionGoal(x.unit,'credits'),slot:protocolBonus(x.droid,x.unit.variant,'CREDITS')}));
  const earns=seated=>{
    const taken=new Set(seated.map(x=>keyOf(x.unit))),rest=pool.filter(x=>!taken.has(keyOf(x.unit))&&x.slot>0).sort((a,b)=>b.slot-a.slot);
    // The strongest bonus goes to the region that earns most.
    const bonus=new Map(open.map((region,i)=>[region,rest[i]?.slot||0]));
    const income=PROTOCOL_REGIONS.reduce((sum,region)=>{const held=fixedSlot(region),held_d=held&&state.droids.find(d=>d.name===held.name);
      return sum+regions[region].beforeBonus*(1+(held?protocolBonus(held_d,held.variant,'CREDITS'):bonus.get(region)||0)/100)},0);
    return income*(multiplier+seated.reduce((sum,x)=>sum+x.seat,0)/100)/multiplier;
  };
  const candidates=pool.filter(x=>x.seat>0);let best={seated:[],value:earns([])};
  const tryout=(seated,from)=>{
    const value=earns(seated);if(value>best.value*(1+1e-9))best={seated,value};
    if(seated.length<seats)for(let i=from;i<candidates.length;i++)tryout([...seated,candidates[i]],i+1);
  };
  tryout([],0);
  // What you have now, for the hint: the Protocol droids already in a seat.
  const now=earns(candidates.filter(x=>p.placed.some(y=>keyOf(y)===keyOf(x.unit)&&y.station==='COMPANION')));
  return {units:best.seated.sort((a,b)=>b.seat-a.seat).map(x=>x.unit),gain:now>0?best.value/now-1:0};
}
function companionActivityPicks(p){
  const id=companionActivity(),activity=COMPANION_ACTIVITIES[id];
  if(!activity)return {id:null,picks:[],missing:[],locked:[]};
  const keyOf=x=>`${x.source}:${x.unit}`,fixed=p.placed.filter(x=>x.lockedSlot||isBuilding(x)),fixedKeys=new Set(fixed.map(keyOf));
  const locked=fixed.filter(x=>x.station==='COMPANION'),seats=stationSlotIndices('COMPANION').filter(slot=>!locked.some(x=>x.slot===slot));
  const units=expandedOwned().filter(x=>!fixedKeys.has(keyOf(x))),chosen=[],missing=[],working=[];
  const workCapacity=productiveStations().filter(spot=>!fixed.some(x=>x.station===spot.station&&x.slot===spot.slot)).length;
  for(const name of activity.prefer){
    if(locked.some(x=>x.name===name))continue;
    const active=fixed.find(x=>x.station!=='COMPANION'&&companionPerkActive(x,name));
    if(active){working.push(active);continue;}
    const unit=units.find(x=>x.name===name);
    if(!unit){missing.push(name);continue}
    if(working.filter(x=>!fixedKeys.has(keyOf(x))).length<workCapacity&&companionPerkActive({...unit,station:'WORKER'},name)){working.push(unit);continue;}
    if(chosen.length<seats.length)chosen.push({unit,why:'preferred'});
  }
  // Scrap farming is a trade-off rather than a ranking, so it has its own choice.
  let gain=null;
  if(id==='scrap'){const choice=scrapCompanionChoice(p,units,seats.length-chosen.length);gain=choice.gain;for(const unit of choice.units)chosen.push({unit,why:'Credits'})}
  const goal=id==='scrap'?null:COMPANION_GOALS.find(g=>g.id===activity.goal);
  if(goal){
    const value=x=>unitCompanionGoal(x,goal.id),income=x=>state.droids.find(d=>d.name===x.name)?.variants?.[x.variant]?.income||0;
    const pool=units.filter(x=>value(x)>0&&!working.some(u=>keyOf(u)===keyOf(x))&&!chosen.some(c=>keyOf(c.unit)===keyOf(x)))
      // Best perk first; between equals, the one that earns least is missed least.
      .sort((a,b)=>value(b)-value(a)||income(a)-income(b));
    while(chosen.length<seats.length&&pool.length)chosen.push({unit:pool.shift(),why:goal.short});
  }
  // A pick already in a seat keeps it; the others take the seats left, in order.
  const free=[...seats],picks=[];
  for(const c of chosen){const now=p.placed.find(x=>keyOf(x)===keyOf(c.unit));if(now?.station==='COMPANION'&&free.includes(now.slot)){free.splice(free.indexOf(now.slot),1);picks.push({...c.unit,station:'COMPANION',slot:now.slot,companionWhy:c.why})}}
  for(const c of chosen)if(!picks.some(x=>keyOf(x)===keyOf(c.unit)))picks.push({...c.unit,station:'COMPANION',slot:free.shift(),companionWhy:c.why});
  return {id,picks,missing,locked,gain,working};
}
const preferredCompanionsFull=()=>preferredCompanions().length>=companionSlotCount();
const droidexGapsAbove=(name,variant)=>{const d=state.droids.find(x=>x.name===name);if(!d||isIconic(d))return[];return VARIANTS.slice(variantRank(variant)+1).filter(v=>!droidexEntry(name,v))};
// The next rebirth consumes 3 droids, so they are held back from the sell total.
// A requirement you have not met yet still holds one back: the copy you are
// saving chips to upgrade is the whole point of the exercise, so selling it
// would be self-defeating.
function nextRebirthHoldBacks(units){
  const next=(state.rebirths[state.cycle]||[]).find(r=>r.to===state.rebirth+1),held=new Map();
  for(const req of next?.requiredDroids||[]){
    const needed=variantRank(req.variant),d=state.droids.find(x=>x.name===req.droidName);
    const owned=units.filter(u=>u.name===req.droidName&&!held.has(`${u.source}:${u.unit}`));
    // Already good enough: keep the cheapest such copy so the better ones stay
    // sellable. Otherwise keep the closest copy below the requirement, which is
    // the cheapest one to finish upgrading.
    const ready=owned.filter(u=>rebirthVariantReady(u.variant,req.variant)).sort((a,b)=>chipSellValue(d,a.variant)-chipSellValue(d,b.variant))[0];
    const upgradable=owned.filter(u=>!rebirthVariantReady(u.variant,req.variant)).sort((a,b)=>variantRank(b.variant)-variantRank(a.variant))[0];
    const pick=ready||upgradable;
    if(pick)held.set(`${pick.source}:${pick.unit}`,{...pick,at:next.to,required:req.variant,chipsNeeded:ready?0:chipsToVariant(d,pick.variant,req.variant)});
  }
  return held;
}
// Independent next-rebirth scenarios, not a queue of batches to spend together.
function rebirthFusionOptions(p,units,held,total){
  const next=(state.rebirths[state.cycle]||[]).find(r=>r.to===state.rebirth+1);
  const targets=(next?.requiredDroids||[]).filter(req=>![...held.values()].some(u=>u.name===req.droidName&&variantStep(u.variant)>=variantStep(req.variant)));
  if(!targets.length)return[];
  const positions=new Map((p.placed||[]).map(u=>[`${u.source}:${u.unit}`,u])),groups=new Map();
  for(const u of units){
    const key=`${u.source}:${u.unit}`,d=fusionDroid(u.name),placed=positions.get(key)||{...u,station:u.preferred};
    if(held.has(key)||u.lockedSlot||placed.lockedSlot||isBuilding(placed)||placed.station==='COMPANION'||!d||isIconic(d)||isFusion(d))continue;
    const group=groups.get(`${u.name}:${u.variant}`)||[];
    if(group.length<3)group.push({...u,station:placed.station,slot:placed.slot});
    groups.set(`${u.name}:${u.variant}`,group);
  }
  const pool=[...groups.values()].flat(),best=new Map(),heldChips=[...held.values()].reduce((sum,u)=>sum+u.chipsNeeded,0);
  for(let a=0;a<pool.length;a++)for(let b=a+1;b<pool.length;b++)for(let c=b+1;c<pool.length;c++){
    const inputs=[pool[a],pool[b],pool[c]],out=fusionOutcome(inputs);
    if(!out||!['rarity','quality','recipe'].includes(out.kind))continue;
    for(const req of targets){
      const d=fusionDroid(req.droidName);if(!d||isIconic(d))continue;
      const sure=out.kind!=='rarity';
      if(sure?out.name!==d.name:isFusion(d)||out.rarity!==d.rarity)continue;
      if(isFusion(d)&&variantStep(out.variant)<variantStep(req.variant))continue;
      const existing=[...held.values()].find(u=>u.name===d.name);
      if(existing&&variantStep(out.variant)<=variantStep(existing.variant))continue;
      const lostChips=inputs.reduce((sum,u)=>sum+chipSellValue(fusionDroid(u.name),u.variant),0),chips=chipsToVariant(d,out.variant,req.variant);
      const otherUpgrades=heldChips-(existing?.chipsNeeded||0),remainingChips=total-lostChips;
      const option={name:d.name,required:req.variant,variant:out.variant,kind:out.kind,from:out.from,sure,inputs,lostChips,chips,otherUpgrades,remainingChips,
        shortfall:Math.max(0,chips+otherUpgrades-remainingChips),shortfallBb8:Math.max(0,chips+otherUpgrades-remainingChips*2),
        targetCraftCost:knownNumber(d.variants?.[out.variant]?.cost)?Number(d.variants[out.variant].cost):null};
      const key=`${d.name}:${out.variant}:${out.kind}:${out.from||''}`,prior=best.get(key);
      if(!prior||lostChips<prior.lostChips)best.set(key,option);
    }
  }
  return targets.map(req=>({req,options:[...best.values()].filter(o=>o.name===req.droidName).sort((a,b)=>Number(b.sure)-Number(a.sure)||a.shortfallBb8-b.shortfallBb8||a.chips-b.chips||a.lostChips-b.lostChips)}));
}
function rebirthFusionCreditBudget(balance,cost){
  if(!String(balance??'').trim()||!String(cost??'').trim())return null;
  try{const available=parseGalacticNumber(balance),needed=parseGalacticNumber(cost);return {available,needed,shortfall:Math.max(0,needed-available),remaining:Math.max(0,available-needed)};}catch{return {invalid:true};}
}
document.addEventListener('input',event=>{
  const root=event.target.closest('.rebirth-fusion-calculator');if(!root)return;
  if(!event.target.matches('[data-fusion-credit-balance],[data-fusion-credit-cost]'))return;
  for(const row of root.querySelectorAll('.rebirth-fusion-option')){
    const budget=rebirthFusionCreditBudget(root.querySelector('[data-fusion-credit-balance]').value,row.querySelector('[data-fusion-credit-cost]').value),status=row.querySelector('[data-fusion-credit-status]');
    status.textContent=!budget?'Enter your spendable credits and the total cost shown in-game.':budget.invalid?'Enter a number such as 850B or 1.5T.':budget.shortfall?`${fmt(budget.shortfall)} credits short for this attempt.`:`Enough credits for this attempt · ${fmt(budget.remaining)} left.`;
  }
});
function rebirthFusionCalculatorHtml(p,units,held,total){
  const targets=rebirthFusionOptions(p,units,held,total);if(!targets.length)return'';
  return `<div class="rebirth-fusion-calculator"><h3>Fuse towards your missing rebirth droids</h3><p>These are alternative single-batch attempts using your current droids. Keep the inputs instead of selling them. Your next-rebirth copies, locked droids, companions and unfinished builds are excluded. A random roll may produce a different droid; the chance of a specific result is unknown.</p><label class="field">Credits available to spend on fusion<input class="form-control" data-fusion-credit-balance placeholder="e.g. 850B or 1.5T" inputmode="decimal"><small>Use what you can spend after keeping enough credits for the rebirth. These inputs compare one attempt; they do not change your Base.</small></label>${targets.map(({req,options})=>`<section class="rebirth-fusion-target"><h4>${escapeAttr(req.droidName)} · need ${requirementVariantText(req.variant)}</h4>${options.length?`<p>Best available batch for each result variant and route. Chip totals below exclude all three inputs and account for your other rebirth upgrades.</p><div class="rebirth-fusion-options">${options.map(o=>`<details class="rebirth-fusion-option"><summary><strong>${o.sure?'Guaranteed droid':'Random '+rarityLabel(fusionDroid(o.name).rarity)+' roll'} · ${variantText(o.variant)}</strong> &middot; ${o.chips?fmt(o.chips):'0'} upgrade chips</summary><p>Fuse ${o.inputs.map(u=>`${escapeAttr(u.name)} ${variantText(u.variant)}${u.station?` (${placeName(u.station)}${Number.isInteger(u.slot)?` ${u.slot+1}`:''})`:''}`).join(' + ')}.</p><p>${o.sure?'Result:':'If it rolls'} <b>${escapeAttr(o.name)}</b>: ${o.chips?`${fmt(o.chips)} chips to reach ${variantText(o.required)}`:baseVariant(o.required)==='KYBER'?`activate for ${activationCostText(fusionDroid(o.name))}`:'already meets the rebirth variant'}.</p><dl><div><dt>Sell the remaining droids</dt><dd>${o.remainingChips?fmt(o.remainingChips):'0'} chips · ${o.remainingChips?fmt(o.remainingChips*2):'0'} with BB-8</dd></div><div><dt>Short after all rebirth upgrades</dt><dd>${o.shortfall?fmt(o.shortfall):'0'} chips · ${o.shortfallBb8?fmt(o.shortfallBb8):'0'} with BB-8</dd></div><div><dt>${escapeAttr(o.name)} crafting cost at ${variantLabel(o.variant)}</dt><dd>${o.targetCraftCost===null?'Unknown':fmt(o.targetCraftCost)+' credits'}${o.sure?'':' if it rolls'}</dd></div></dl><label class="field">Total credits for this attempt (from game)<input class="form-control" data-fusion-credit-cost placeholder="e.g. 20B" inputmode="decimal"><small>Include any fusion and result crafting charge. The target crafting cost above is reference information, not a confirmed fusion fee.</small></label><p data-fusion-credit-status role="status">Enter your spendable credits and the total cost shown in-game.</p><small>Alternative only: inputs may also appear in other options. After a roll, update your Base and recalculate before choosing another batch.</small></details>`).join('')}</div>`:'<p>No suitable single-batch route from your available droids. Pick up this droid or collect inputs for a matching fusion route. Three identical droids below the top quality upgrade that droid instead.</p>'}</section>`).join('')}</div>`;
}
function chipSellCalculatorHtml(p){
  const units=expandedOwned();
  if(!units.length)return'';
  const held=nextRebirthHoldBacks(units),next=(state.rebirths[state.cycle]||[]).find(r=>r.to===state.rebirth+1);
  const rows=new Map();
  let total=0,sellable=0,standard=0;
  for(const unit of units){
    if(held.has(`${unit.source}:${unit.unit}`))continue;
    const d=state.droids.find(x=>x.name===unit.name),value=chipSellValue(d,unit.variant);
    if(!value){standard++;continue}
    total+=value;sellable++;
    const row=rows.get(d.rarity)||{count:0,chips:0};row.count++;row.chips+=value;rows.set(d.rarity,row);
  }
  const bb8=bb8CompanionActive(p.placed),order=['COMMON','RARE','EPIC','LEGENDARY','MYTHIC'];
  // What the held-back droids still cost to bring up to the required quality.
  const needed=[...held.values()].reduce((sum,unit)=>sum+unit.chipsNeeded,0);
  const shortfall=Math.max(0,needed-total),shortfallBb8=Math.max(0,needed-total*2);
  const breakdown=order.filter(rarity=>rows.has(rarity)).map(rarity=>{const row=rows.get(rarity);return `<tr><th>${rarityText(rarity)}</th><td>${row.count}</td><td>${fmt(row.chips)}</td><td>${fmt(row.chips*2)}</td></tr>`}).join('');
  const heldCards=[...held.values()].map(unit=>{const d=state.droids.find(x=>x.name===unit.name);return `<a class="chip-held-card ${unit.chipsNeeded||activationNeeded(unit.variant,unit.required)?'needs-upgrade':''}" href="#/droid/${slug(d.name)}"><div>${picture(d,unit.variant)}</div><span><strong>${d.name}</strong><small>${activationNeeded(unit.variant,unit.required)?rebirthActionText(d,unit.variant,unit.required):unit.chipsNeeded?`${variantText(unit.variant)} → ${variantText(unit.required)} · ${fmt(unit.chipsNeeded)} chips${baseVariant(unit.required)==='KYBER'?` &middot; then activate for ${activationCostText(d)}`:''}`:`${variantText(unit.variant)} · ready`}</small></span></a>`}).join('');
  const missing=(next?.requiredDroids||[]).length-held.size;
  const goalStats=needed?`<div class="stat"><small>Needed for Rebirth ${next.to}</small><strong>${fmt(needed)}</strong><em>to finish upgrading ${[...held.values()].filter(u=>u.chipsNeeded).map(u=>u.name).join(', ')}</em></div><div class="stat ${shortfall?'chip-sell-short':'chip-sell-covered'}"><small>${shortfall?'Still short after selling':'Covered by selling'}</small><strong>${fmt(shortfall||total-needed)}</strong><em>${shortfall?(shortfallBb8?`${fmt(shortfallBb8)} short with BB-8`:'covered if BB-8 is your companion'):'chips left over'}</em></div>`:'';
  return `<section class="scrap-calculator chip-sell-calculator"><div><p class="eyebrow">Workshop calculator</p><h2>Rebirth preparation</h2><p>Compare selling for Upgrade Chips with fusing towards your next rebirth. The sell totals hold back your required droids, including copies you are still upgrading.</p><small>${sellable} sellable droid${sellable===1?'':'s'}${standard?` · ${standard} Standard or Iconic worth nothing`:''}${next?` · holding back ${held.size} for Rebirth ${next.to}`:' · no next rebirth in this cycle'}</small></div><div class="chip-sell-totals"><div class="stat"><small>Sell everything</small><strong>${fmt(total)}</strong><em>Upgrade Chips</em></div><div class="stat chip-sell-bb8 ${bb8?'active':''}"><small>With BB-8 companion</small><strong>${fmt(total*2)}</strong><em>${bb8?'BB-8 is your companion':'Doubled — needs BB-8 as companion'}</em></div>${goalStats}</div>${breakdown?`<div class="chip-sell-breakdown"><table><thead><tr><th>Rarity</th><th>Droids</th><th>Chips</th><th>With BB-8</th></tr></thead><tbody>${breakdown}</tbody><tfoot><tr><th>Total</th><td>${sellable}</td><td>${fmt(total)}</td><td>${fmt(total*2)}</td></tr></tfoot></table></div>`:'<p class="chip-sell-empty">Nothing on your roster can be sold for Upgrade Chips yet — Standard quality droids are worth nothing.</p>'}${heldCards?`<div class="chip-held"><small>Held back for Rebirth ${next.to}${missing>0?` · ${missing} still missing from your roster`:''}</small><div class="chip-held-grid">${heldCards}</div></div>`:''}${rebirthFusionCalculatorHtml(p,units,held,total)}</section>`
}
// Overhead map of the base, drawn in code to the player's own traced map
// (assets/map/map numbered *.png): Astromech platform on the left with its five
// landing pads, the tall Battle building top right with its door at the bottom,
// the two-circle Lounge on the right, the Worker pod ring bottom right with the
// Fusion lab circle against its side, the walkway corridor between them and
// the small circle by the way into the base. Every slot dot the traced map
// carried keeps its measured position; the Protocol consoles, the Upgrade Chip
// station (between the stairs up to the platform), the Fusion pads and tanks
// and the upstairs Battle strip are the additions. Positions are percentages
// of the drawing, which is 1136 by 992 units like the traced artwork.
const MAP_SIZE={w:1136,h:992};
const MAP_SPOTS={
  // Each list is in slot order, not map order — position 0 is the slot you start
  // with and the rest follow the unlock sequence, so a pin always carries the
  // Rebirth its slot really needs.
  downstairs:{
    // 1, 2, 3, 4, then rb1 rb4 rb7 rb10 round the pod; rb12 rb14 rb16 stand on
    // the walkway between the Battle door and the Lounge.
    WORKER:[[75.36,66.72],[79.21,75.76],[68.09,65.31],[61.94,68.94],[59.58,76.07],[62.38,84.32],[70.61,87.65],[77.63,83.61],[72.7,33.9],[69.8,34.8],[67,34.2]],
    // 1, 2, 3, then rb2 rb5 rb8 rb11 rb13 rb15 around the platform edge.
    ASTROMECH:[[20.1,51.32],[29.11,40.2],[20.99,40.2],[34.46,40.2],[39.8,40.2],[36.48,55.17],[45.27,55.17],[30.44,55.17],[26.19,55.17]],
    // 1, 2, then rb3 rb6 rb9 on the ground floor — rb17-22 are upstairs.
    BATTLE:[[49.6,22.98],[53.05,24.07],[55.63,22.21],[58.64,23.37],[60.52,21.61]],
    // Build 1 (the Shipyard) in line east of the platform stairs behind its Craft
    // console, Build 2 on the platform, Build 3 by the Battle door.
    BUILD:[[65.1,48],[41.92,48.32],[55.95,32.37]],
    // The Upgrade Chip station stands between the two stairs up to the platform,
    // the Worker Craft console directly behind the Shipyard, Worker Credits
    // by the Rebirth stand; the other consoles in front of their region's Build
    // slot, Battle Credits at the near end of the Battle row.
    PROTOCOL_WORKER_CREDITS:[[81.4,60.5]],PROTOCOL_WORKER_CRAFTING:[[60.7,47.6]],
    PROTOCOL_ASTROMECH_CREDITS:[[47,51]],PROTOCOL_ASTROMECH_CRAFTING:[[37.5,48.5]],
    PROTOCOL_BATTLE_CREDITS:[[47.04,27.5]],PROTOCOL_BATTLE_CRAFTING:[[55.95,27.8]],
    UPGRADE_CHIP:[[54.8,47.4]],
    BLUEPRINT:[[74.8,44.9],[75.9,46.1],[76.9,47.3]],
    // The two rooms sit corner to corner, the upper one up and to the left. 1-5
    // round the lower room; in the upper room rb17-20 line the east wall from
    // the doorway round to the top and the four Nova slots carry on down the
    // west wall, leaving the doorway to the lower room clear.
    LOUNGE:[[76.82,42.43],[85.02,45.93],[75.5,36.1],[80,29.8],[88.42,40.73]],
    LOUNGE_REBIRTH:[[77.8,23.2],[76.7,19.6],[74.2,17.2],[70.9,16.6]],
    LOUNGE_NOVA:[[67.8,17.8],[65.7,20.7],[65.2,24.4],[66.3,28]],
    // Three Place Droid pads on the table, the build tanks behind them.
    FUSION:[[49.9,68.3],[53.2,68.3],[56.6,68.3]],FUSION_BUILD:[[57.1,72.7],[53.2,73.9],[49.4,72.7]]
  },
  // rb17 down to rb22 on the mezzanine, drawn as a strip beside the Battle
  // building so the whole base is one view.
  upstairs:{BATTLE:[[43,10.1],[43,14.6],[43,19.1],[43,23.6],[43,28.1],[43,32.6]]}
};
const MAP_FLOORS=['downstairs','upstairs'];
const baseViewIsMap=()=>localStorage.getItem('droid-archive-map-hidden')!=='1';
const mapPinStyle=(x,y)=>`left:${x}%;top:${y}%`;
const mapPx=([x,y])=>[x*MAP_SIZE.w/100,y*MAP_SIZE.h/100];
// The drawing, shape for shape from the traced map, in the game's own colours:
// the slate deck of the platform with its grated squares and round landing
// pads, teal stairs, the rusted red Battle building, the banded sand domes of
// the Lounge and the Fusion lab, the double ring of the Worker pod round its
// green machine, the walkways, and a coloured floor pad under every slot.
function baseMapSvg(){
  const spots=MAP_SPOTS.downstairs;
  const stair=(x,y,rot=0,len=44)=>`<g class="map-stair" transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-len/2}" y="-12" width="${len}" height="24" rx="3"/><path d="M${-len/2+6} -6H${len/2-6}M${-len/2+6} 0H${len/2-6}M${-len/2+6} 6H${len/2-6}"/></g>`;
  const ship='M0 -34L6 -9L30 -22L33 -14L10 1L10 13L27 28L21 32L4 19L0 34L-4 19L-21 32L-27 28L-10 13L-10 1L-33 -14L-30 -22L-6 -9Z';
  const pad=(cx,cy,r,rot)=>`<g class="map-pad"><circle filter="url(#mapShadow)" cx="${cx}" cy="${cy}" r="${r}"/><circle class="map-grate" cx="${cx}" cy="${cy}" r="${r*.72}"/>${rot===undefined?'':`<path class="map-ship" transform="translate(${cx} ${cy}) rotate(${rot})" d="${ship}"/>`}</g>`;
  const dome=(cx,cy,r,cls='')=>`<g class="map-dome ${cls}"><circle filter="url(#mapShadow)" cx="${cx}" cy="${cy}" r="${r}"/><circle class="map-dome-band" cx="${cx}" cy="${cy}" r="${r-11}"/><circle class="map-dome-band" cx="${cx}" cy="${cy}" r="${r*.55}"/><circle class="map-dome-top" cx="${cx-r*.18}" cy="${cy-r*.18}" r="${r*.5}"/></g>`;
  const fan=(cx,cy)=>`<g class="map-fan"><circle cx="${cx}" cy="${cy}" r="12"/><path class="map-fan-blade" d="M${cx-7} ${cy-7}L${cx+7} ${cy+7}M${cx+7} ${cy-7}L${cx-7} ${cy+7}"/><circle class="map-fan-hub" cx="${cx}" cy="${cy}" r="3"/></g>`;
  // Floor pads under every slot, in the colours the game paints them.
  const slotPads=[
    ...spots.ASTROMECH.map(p=>['astromech','rect',p]),...spots.WORKER.map(p=>['worker','circle',p]),...spots.BATTLE.map(p=>['battle','rect',p]),
    ...MAP_SPOTS.upstairs.BATTLE.map(p=>['battle','rect',p]),
    ...[...spots.LOUNGE,...spots.LOUNGE_REBIRTH,...spots.LOUNGE_NOVA].map(p=>['lounge','circle',p]),
    ...spots.BUILD.map(p=>['build','rect',p]),...spots.FUSION.map(p=>['fusion','circle',p]),...spots.FUSION_BUILD.map(p=>['build','rect',p]),
    ...spots.BLUEPRINT.map(p=>['build','rect',p]),...spots.UPGRADE_CHIP.map(p=>['chip','rect',p]),
    ...Object.keys(PROTOCOL_SLOTS).flatMap(station=>(spots[station]||[]).map(p=>['protocol','rect',p]))
  ].map(([cls,shape,p])=>{const [x,y]=mapPx(p);return shape==='circle'?`<circle class="map-slot map-slot-${cls}" cx="${x}" cy="${y}" r="22"/>`:`<rect class="map-slot map-slot-${cls}" x="${x-21}" y="${y-21}" width="42" height="42" rx="7"/>`}).join('');
  return `<svg class="base-map-svg" viewBox="0 0 ${MAP_SIZE.w} ${MAP_SIZE.h}" role="img" aria-label="Overhead map of the base">
<defs>
<pattern id="mapGrate" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#2e343d"/><rect x="2" y="2" width="10" height="10" fill="#171b21"/></pattern>
<radialGradient id="mapDome" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#e6d6b6"/><stop offset=".7" stop-color="#c2ac89"/><stop offset="1" stop-color="#9c8767"/></radialGradient>
<linearGradient id="mapRust" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c24a40"/><stop offset=".55" stop-color="#a3372f"/><stop offset="1" stop-color="#7f2a24"/></linearGradient>
<filter id="mapShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#3b2a12" flood-opacity=".38"/></filter>
<linearGradient id="mapDeck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#66768e"/><stop offset="1" stop-color="#48576c"/></linearGradient>
<linearGradient id="mapMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0f3f7"/><stop offset=".5" stop-color="#c3cad3"/><stop offset="1" stop-color="#8f98a4"/></linearGradient>
<radialGradient id="mapRing" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e2dccd"/><stop offset="1" stop-color="#b3ab9a"/></radialGradient>
</defs>
<g class="map-stubs" filter="url(#mapShadow)"><rect x="262" y="300" width="16" height="60"/><rect x="472" y="300" width="16" height="60"/><rect x="262" y="600" width="16" height="60"/><rect x="472" y="600" width="16" height="60"/><rect x="140" y="462" width="60" height="16"/></g>
<rect class="map-platform" filter="url(#mapShadow)" x="185" y="350" width="405" height="250" rx="20"/>
<rect class="map-platform-inner" x="203" y="368" width="369" height="214" rx="12"/>
<rect class="map-grate" x="300" y="430" width="52" height="52"/><rect class="map-grate" x="362" y="430" width="52" height="52"/><rect class="map-grate" x="424" y="482" width="52" height="52"/><rect class="map-grate" x="300" y="510" width="52" height="52"/>
${pad(270,265,78,10)}${pad(480,265,78,-15)}${pad(270,690,78,170)}${pad(480,690,78,200)}${pad(100,470,88)}
${stair(590,438,90)}${stair(590,502,90)}

<g class="map-hangar-group" transform="rotate(-4 620 197)">
<rect class="map-hangar" filter="url(#mapShadow)" x="525" y="22" width="190" height="350" rx="60"/>
<rect class="map-hangar-inner" x="542" y="39" width="156" height="316" rx="46"/>
${fan(570,66)}${fan(603,56)}${fan(637,56)}${fan(670,66)}
</g>

<g class="map-mezzanine" filter="url(#mapShadow)"><rect x="462" y="72" width="54" height="276" rx="27"/></g>
<rect class="map-lounge-join" x="835" y="265" width="72" height="92" rx="24" transform="rotate(-38 871 311)"/>
${dome(812,236,84,'map-lounge')}${dome(930,386,95,'map-lounge')}

<g class="map-ring-group"><circle class="map-ring" filter="url(#mapShadow)" cx="800" cy="760" r="172"/><circle class="map-ring-gap" cx="800" cy="760" r="140"/><circle class="map-ring" cx="800" cy="760" r="95"/><circle class="map-pit" cx="800" cy="760" r="62"/><circle class="map-machine" cx="800" cy="760" r="30"/><circle class="map-machine-hub" cx="800" cy="760" r="9"/></g>

${dome(605,695,87,'map-fusion')}

<g class="map-slots">${slotPads}</g>
${mapGridOverlay()}
</svg>`;
}
// A lettered grid over the map (add ?mapgrid=1 to the address) so a position
// can be named as a cell, e.g. "the Lounge belongs at H4".
function mapGridOverlay(){
  if(!/[?&]mapgrid=1/.test(location.search))return '';
  const cols=12,rows=10,cw=MAP_SIZE.w/cols,rh=MAP_SIZE.h/rows,parts=[];
  for(let c=0;c<=cols;c++)parts.push(`<line x1="${c*cw}" y1="0" x2="${c*cw}" y2="${MAP_SIZE.h}"/>`);
  for(let r=0;r<=rows;r++)parts.push(`<line x1="0" y1="${r*rh}" x2="${MAP_SIZE.w}" y2="${r*rh}"/>`);
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++)parts.push(`<text x="${c*cw+6}" y="${r*rh+22}">${String.fromCharCode(65+c)}${r+1}</text>`);
  return `<g class="map-grid">${parts.join('')}</g>`;
}
// Flattens a floor's pins into slots the Base already understands. Lounge runs
// base slots first then the Rebirth and Nova ones, which is the order the game
// unlocks them. Markers carry the same data attributes the list view uses, so
// the Base page's existing handlers wire them up untouched: an empty slot opens
// the picker, an occupied one opens the swap, blueprints open the blueprint
// picker. The six mezzanine Battle slots sit on the same map as the rest.
function baseMapHtml(p){
  const spots=mapSlots();
  // A spot you have not unlocked yet is not a spot. These decide what the header
  // counts, so "spots filled" is out of the slots this Base actually has.
  const available=s=>s.station==='BLUEPRINT_STORAGE'?s.index<capacity('BLUEPRINT_STORAGE'):isSlotEligible(s.station,s.index)&&isSlotPurchased(s.station,s.index);
  const filledAt=s=>s.station==='BLUEPRINT_STORAGE'?state.blueprints.some(b=>Number(b.slot)===s.index):p.placed.some(x=>x.station===s.station&&x.slot===s.index);
  const markers=spots.map(spot=>{
    const {station,index,x,y}=spot,pos=mapPinStyle(x,y);
    if(station==='BLUEPRINT_STORAGE'){
      const bp=state.blueprints.find(b=>Number(b.slot)===index),locked=index>=capacity('BLUEPRINT_STORAGE');
      if(bp){const d=state.droids.find(x=>x.name===bp.name),i=state.blueprints.indexOf(bp);
        return `<div class="map-pin" style="${pos}"><div class="map-pin-actions"><button class="slot-swap craft-blueprint" data-blueprint="${i}" title="Craft into Build">⚒</button><button class="slot-delete delete-blueprint" data-blueprint="${i}" title="Remove blueprint">×</button></div><span class="map-pin-face" title="${escapeAttr(`${bp.name} ${variantLabel(bp.variant)} blueprint`)}">${picture(d,bp.variant)}</span></div>`}
      return `<div class="map-pin" style="${pos}"><button class="map-pin-face open ${locked?'locked':''} blueprint-open" ${locked?'disabled':''} data-blueprint-slot="${index}" title="${locked?'Locked blueprint slot':'Add blueprint'}"><span class="slot-icon">${stationIcon('BLUEPRINT_STORAGE')}</span></button></div>`;
    }
    const occupant=p.placed.find(x=>x.station===station&&x.slot===index);
    if(occupant){
      const d=state.droids.find(x=>x.name===occupant.name),match=!isIconic(d)&&(station===d.type||isProtocolStation(station)&&d.type==='PROTOCOL'),building=isBuilding(occupant),locked=Boolean(occupant.lockedSlot);
      // Same controls as the list view, stacked above the portrait so they never
      // sit on top of it or of the neighbouring slot's card.
      const actions=[
        building?`<button class="slot-complete" data-complete-source="${occupant.source}" data-complete-unit="${occupant.unit}" title="Mark as finished building">✓</button>`:'',
        isIconic(d)?'':`<button class="slot-variant" data-source="${occupant.source}" data-name="${escapeAttr(d.name)}" data-variant="${occupant.variant}" data-station="${station}" data-slot="${index}" title="Change quality">◆</button>`,
        `<button class="slot-lock ${locked?'active':''}" data-source="${occupant.source}" data-unit="${occupant.unit}" title="${locked?'Unlock':'Lock for Optimise'}">${locked?'🔒':'🔓'}</button>`,
        `<button class="slot-swap" data-source="${occupant.source}" data-unit="${occupant.unit}" title="Swap">⇄</button>`,
        `<button class="slot-delete" data-source="${occupant.source}" title="Remove">×</button>`,
      ].join('');
      // Same drag attributes the list view's cards carry, so one set of handlers
      // drives both. The portrait is a link, and links drag themselves, so it has
      // to opt out or the browser drags the URL instead of the droid.
      const drag=DRAG_AND_DROP_ENABLED?` draggable="true" data-source="${occupant.source}" data-unit="${occupant.unit}"`:'';
      return `<div class="map-pin filled ${match?'matched':''} ${building?'building':''} ${locked?'pinned':''}" style="${pos}" data-slot-station="${station}" data-slot-index="${index}"${building?'':drag}><div class="map-pin-actions">${actions}</div><a class="map-pin-face" draggable="false" href="#/droid/${slug(d.name)}" title="${escapeAttr(`${occupant.name} ${variantLabel(occupant.variant)} · ${stationName(station)} ${index+1}${building?' · still building':''}`)}">${picture(d,occupant.variant)}</a></div>`;
    }
    const eligible=isSlotEligible(station,index),purchased=isSlotPurchased(station,index);
    // Two different kinds of unavailable: not reached yet, or reached and not
    // bought. Only the second one is something you can go and do right now.
    if(!eligible||!purchased)return `<div class="map-pin" style="${pos}"><span class="map-pin-face locked ${eligible?'unbought':''}" title="${escapeAttr(eligible?`${stationName(station)} slot ${index+1} — unlocked at Rebirth ${slotUnlockRebirth(station,index)}, not bought yet`:lockedSlotLabel(station,index)||`Locked ${stationName(station)} slot`)} - ${escapeAttr(slotPriceLabel(station,index))}"><span class="slot-icon">${stationIcon(station)}</span></span></div>`;
    return `<div class="map-pin" style="${pos}" data-slot-station="${station}" data-slot-index="${index}"><button class="map-pin-face open" data-station="${station}" data-slot-index="${index}" title="${escapeAttr(`Add to ${stationName(station)} slot ${index+1}`)}"><span class="slot-icon">${stationIcon(station)}</span></button></div>`;
  }).join('');
  const usable=spots.filter(available),locked=spots.length-usable.length;
  const counts=usable.reduce((n,s)=>n+(filledAt(s)?1:0),0);
  return `<section class="base-map"><header><div><strong>Base map</strong><span>${counts} of ${usable.length} spots filled${locked?` · ${locked} still locked`:''}</span></div></header><div class="base-map-art">${baseMapSvg()}${markers}</div></section>`;
}
function mapSlots(){
  const spots=MAP_SPOTS.downstairs,out=[];
  const add=(station,list,offset=0)=>(list||[]).forEach(([x,y],i)=>out.push({station,index:i+offset,x,y}));
  add('WORKER',spots.WORKER);add('ASTROMECH',spots.ASTROMECH);add('BATTLE',spots.BATTLE);add('BATTLE',MAP_SPOTS.upstairs.BATTLE,BATTLE_UPSTAIRS_FROM);
  add('BUILD',spots.BUILD);add('UPGRADE_CHIP',spots.UPGRADE_CHIP);
  for(const station of Object.keys(PROTOCOL_SLOTS))add(station,spots[station]);
  add('FUSION',spots.FUSION);add('FUSION_BUILD',spots.FUSION_BUILD);
  // loungeSlotMeta splits the Lounge three ways: 0-4 base, 5-8 unlocked by
  // Rebirth, 9-12 bought in the Nova Shop.
  add('LOUNGE',spots.LOUNGE);add('LOUNGE',spots.LOUNGE_REBIRTH,5);add('LOUNGE',spots.LOUNGE_NOVA,9);
  add('BLUEPRINT_STORAGE',spots.BLUEPRINT);
  return out;
}
// ─── Critical strike model ──────────────────────────────────────────────────
// Every figure here is derived from measurements rather than guessed.
//
// Verified against September 27 v1.32.3: GetDroidDepotPickaxeAmount,
// RollPickaxeCritCount and CalculatePickaxeAttack. Eight readings across
// levels 14-17 with and without a +7 Astromech
// fall exactly on one line, and an Astromech's levels stack onto your own, so
// 14+7 behaves identically to a native 21.
//   seconds per hit = 1.2 x (your level + astromech + 1)
//
// Critical Chance starts at 1% and gains 5% a level; Critical Amount starts at
// 50% and gains 10%. Chopper adds 50 points to each. Amount is the bonus over a
// normal hit, so 100% means a crit does double.
//
// Multi Crit: landing a crit starts a chain of extra rolls, each at half the
// previous chance, ending at the cap or the first failure. Level N buys N extra
// rolls, so the cap is N+1 including the original. Chances are not clamped: a
// 200% chance is a guaranteed roll that halves to a guaranteed 100%.
const PICKAXE_SECONDS_PER_LEVEL=1.2;
const CRIT_CHANCE_BASE=0.01,CRIT_CHANCE_PER_LEVEL=0.05;
const CRIT_AMOUNT_BASE=0.50,CRIT_AMOUNT_PER_LEVEL=0.10;
const CHOPPER_CRIT_BONUS=0.50;
const CRIT_UPGRADE_IDS={chance:'critical-chance',amount:'critical-amount',multi:'multi-crit'};
// Some rebirths hand out a permanent crit buff on top of the Nova Shop levels:
// crit chance at 23, 26 and 29; crit amount at 24, 27, 30, 38 and 40. Each is listed
// against its rebirth in nova-shop.json and they stack, so the bonus is the
// running total for every rebirth you have already reached in this cycle.
function rebirthCritBonus(rebirth=state.rebirth){
  const reached=Math.max(0,Number(rebirth)||0);let chance=0,amount=0;
  for(const reward of state.novaShop?.rebirthRewards||[]){
    if((Number(reward.rebirth)||0)>reached)continue;
    chance+=(Number(reward.critChancePercent)||0)/100;
    amount+=(Number(reward.critAmountPercent)||0)/100;
  }
  return{chance,amount};
}
// Which rebirths still owe you a crit buff, for the Rebirth and Base outlooks.
function rebirthCritPerks({after=0,through=Infinity}={}){
  return (state.novaShop?.rebirthRewards||[]).filter(r=>{
    const at=Number(r.rebirth)||0;
    return at>after&&at<=through&&(r.critChancePercent||r.critAmountPercent);
  }).map(r=>({at:Number(r.rebirth)||0,chance:Number(r.critChancePercent)||0,amount:Number(r.critAmountPercent)||0}));
}
const pickaxeHitSeconds=effectiveLevel=>PICKAXE_SECONDS_PER_LEVEL*(Math.max(0,effectiveLevel)+1);
// The rebirth perks reset with a Super Rebirth, so the calculator can leave them
// out to show which upgrade is the best buy for a fresh run.
const critPerksOn=()=>critSetting('perks',1)!==0;
const critChanceFor=(level,chopper)=>CRIT_CHANCE_BASE+CRIT_CHANCE_PER_LEVEL*Math.max(0,level)+(chopper?CHOPPER_CRIT_BONUS:0)+(critPerksOn()?rebirthCritBonus().chance:0);
const critAmountFor=(level,chopper)=>CRIT_AMOUNT_BASE+CRIT_AMOUNT_PER_LEVEL*Math.max(0,level)+(chopper?CHOPPER_CRIT_BONUS:0)+(critPerksOn()?rebirthCritBonus().amount:0);
const multiCritRolls=level=>Math.max(0,level)+1;
// Average damage multiplier of a swing, relative to a non-crit hit. Follows the
// game roll chain: the hit itself, plus the crit amount once per crit landed.
function critMultiplier(chance,amount,rolls){
  let onCrit=1+amount,chain=1;
  for(let k=1;k<rolls;k++){chain*=Math.min(1,chance/Math.pow(2,k));onCrit+=chain*amount}
  const p=Math.min(1,chance);
  return(1-p)+p*onCrit;
}
// Reaching each roll requires every earlier roll to succeed.
function critRollBreakdown(chance,rolls){
  let reach=1;const rows=[];
  for(let k=0;k<rolls;k++){
    const rollChance=Math.max(0,Math.min(1,chance/Math.pow(2,k)));
    reach*=rollChance;rows.push({count:k+1,rollChance,reach});
  }
  return rows;
}
const critProfile=({chanceLevel=0,amountLevel=0,multiLevel=0,chopper=false,pickaxe=0,astromech=0,boost=1,partyMultiplier=1,traitChance=0,traitAmountBonus=0,traitMulti=0}={})=>{
  const chance=critChanceFor(chanceLevel,chopper)+traitChance,amount=critAmountFor(amountLevel,chopper)+traitAmountBonus,rolls=multiCritRolls(multiLevel+traitMulti);
  const base=pickaxeHitSeconds(pickaxe+astromech)*Math.max(1,Number(boost)||1)*Math.max(1,Math.min(2,Number(partyMultiplier)||1)),multiplier=critMultiplier(chance,amount,rolls);
  return{chance,amount,rolls,base,multiplier,perHit:base*multiplier};
};
// Pickaxe Mastery only decides how many levels survive a Super Rebirth. That is
// the floor the calculator starts you at until you say otherwise. It is read from
// the Nova Shop rewards, so new ranks only need the data; before the shop loads
// it falls back to 5 at rank 1 and two more each rank.
const pickaxeMasteryLevels=()=>{
  const r=novaLevelFor('pickaxe-mastery');if(r<=0)return 0;
  const levels=state.novaShop?.upgrades?.find(u=>u.id==='pickaxe-mastery')?.levels||[];
  const kept=Number(String(levels[Math.min(r,levels.length)-1]?.reward||'').match(/\d+/)?.[0]);
  return Number.isFinite(kept)&&kept>0?kept:5+2*(r-1);
};
// An Astromech companion's pickaxe levels stack onto your own.
const companionAstromechBonus=placed=>placed.filter(x=>x.station==='COMPANION').reduce((sum,x)=>{
  return sum+unitCompanionGoal(x,'pickaxe');},0);
const critSetting=(key,fallback)=>{const v=Number(localStorage.getItem('droid-archive-crit-'+key));return Number.isFinite(v)&&localStorage.getItem('droid-archive-crit-'+key)!==null?v:fallback};
const setCritSetting=(key,value)=>localStorage.setItem('droid-archive-crit-'+key,String(value));
const novaLevelCost=(id,level)=>{const upgrade=novaUpgrade(id);return upgrade?novaLevelRow(upgrade,level)?.cost??null:null};
const novaMaxLevel=id=>{const upgrade=novaUpgrade(id);return upgrade?.uncapped?Infinity:upgrade?.levels?.length??0};
// Multi Crit needs Critical Chance first, so its true price is the missing
// Critical Chance ranks plus its own.
const MULTI_CRIT_REQUIRES_CHANCE=4;
function critUpgradeOptions(current){
  const {chanceLevel,amountLevel,multiLevel}=current;
  const now=critProfile(current).multiplier;
  const gain=next=>critProfile({...current,...next}).multiplier/now-1;
  const out=[];
  if(chanceLevel<novaMaxLevel(CRIT_UPGRADE_IDS.chance)){
    const cost=novaLevelCost(CRIT_UPGRADE_IDS.chance,chanceLevel+1);
    out.push({id:CRIT_UPGRADE_IDS.chance,name:'Critical Chance',to:chanceLevel+1,cost,gain:gain({chanceLevel:chanceLevel+1}),note:''});
  }
  if(amountLevel<novaMaxLevel(CRIT_UPGRADE_IDS.amount)){
    const cost=novaLevelCost(CRIT_UPGRADE_IDS.amount,amountLevel+1);
    out.push({id:CRIT_UPGRADE_IDS.amount,name:'Critical Amount',to:amountLevel+1,cost,gain:gain({amountLevel:amountLevel+1}),note:''});
  }
  if(multiLevel<novaMaxLevel(CRIT_UPGRADE_IDS.multi)){
    // Its own price, not a bundle. If Critical Chance is not high enough yet the
    // rank is simply locked, and what it takes to unlock is stated separately.
    const cost=novaLevelCost(CRIT_UPGRADE_IDS.multi,multiLevel+1);
    let locked=false,note='';
    if(chanceLevel<MULTI_CRIT_REQUIRES_CHANCE){
      let extra=0;
      for(let l=chanceLevel+1;l<=MULTI_CRIT_REQUIRES_CHANCE;l++)extra+=novaLevelCost(CRIT_UPGRADE_IDS.chance,l)||0;
      locked=true;note=`locked · needs Critical Chance ${MULTI_CRIT_REQUIRES_CHANCE}, another ${fmt(extra)} Nova`;
    }
    out.push({id:CRIT_UPGRADE_IDS.multi,name:'Multi Crit',to:multiLevel+1,cost,gain:gain({multiLevel:multiLevel+1}),note,locked});
  }
  // Ranked by damage bought per crystal. Anything still locked sorts last, since
  // it is not actually a purchase you can make yet.
  return out.filter(x=>x.cost).map(x=>({...x,value:x.gain/x.cost*1000}))
    .sort((a,b)=>(a.locked?1:0)-(b.locked?1:0)||b.value-a.value);
}
const PRODUCTIVE_STATIONS=['WORKER','ASTROMECH','BATTLE'];
// Where the optimiser may park a droid that earns nothing. A Fusion slot holds
// one without producing, exactly as the Lounge does, so it can be storage too -
// but only on request, because anything parked there is what a Fuse consumes.
const loungeLikeStations=()=>state.fusionAsLounge?['LOUNGE','COMPANION','FUSION']:['LOUNGE','COMPANION'];
const replacementKey=x=>`${x.source}:${x.unit}`;
const replacementSettings=()=>({
  protect:localStorage.getItem('droid-archive-replacement-protect')!=='0',
  minimum:Math.max(0,Number(localStorage.getItem('droid-archive-replacement-minimum')??0)||0),
  minimumEnabled:localStorage.getItem('droid-archive-replacement-minimum-enabled')==='1',
  sort:localStorage.getItem('droid-archive-replacement-sort')||'gain',
  display:localStorage.getItem('droid-archive-replacement-display')==='1',
  view:localStorage.getItem('droid-archive-replacement-view')||'compact',
  target:localStorage.getItem('droid-archive-replacement-target')||''
});
function rebirthProtectedKeys(p){
  const required=new Set((state.rebirths[state.cycle]||[]).filter(r=>r.to>state.rebirth&&r.to<=rebirthGoal()).flatMap(r=>(r.requiredDroids||[]).map(x=>x.droidName))),best=new Map();
  for(const unit of [...p.placed,...p.overflow])if(required.has(unit.name)){const previous=best.get(unit.name);if(!previous||variantRank(unit.variant)>variantRank(previous.variant))best.set(unit.name,unit)}
  return new Set([...best.values()].map(replacementKey));
}
function productiveReplacementTargets(p,protect=true){
  const productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),protectedKeys=protect?rebirthProtectedKeys(p):new Set(),baseIncome=placedBaseIncome(productive);
  return productive.filter(x=>!protectedKeys.has(replacementKey(x))).map(unit=>{
    const d=state.droids.find(x=>x.name===unit.name),rate=droidRate(d,unit.variant,unit.station,baseIncome,unit)*protocolRegionMultiplier(p.placed,unit.station);
    return{...unit,droid:d,base:d?.variants?.[unit.variant]?.income||0,adjusted:rate,hour:rate*3600,protected:false}
  }).sort((a,b)=>a.adjusted-b.adjusted)
}
function replacementThresholds(target,p){
  const productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),remaining=productive.filter(x=>replacementKey(x)!==replacementKey(target)),current=incomeForPlaced(p.placed),remainingIncome=incomeForPlaced([...remaining,...p.placed.filter(x=>isProtocolStation(x.station))]),iconicTotal=[...new Set(remaining.map(x=>x.name))].reduce((sum,name)=>sum+iconicIncome(state.droids.find(d=>d.name===name)),0),multiplier=effectiveMultiplier()||1;
  const weightedIconic=[...new Set(remaining.filter(x=>isIconic(state.droids.find(d=>d.name===x.name))).map(x=>x.name))].reduce((sum,name)=>{const x=remaining.find(x=>x.name===name);return sum+iconicIncome(state.droids.find(d=>d.name===name))*protocolRegionMultiplier(p.placed,x.station)},0);
  return DROID_TYPES.map(type=>{const coefficient=(type===target.station?1.1:1)*protocolRegionMultiplier(p.placed,target.station)+weightedIconic,needed=Math.max(0,(current-remainingIncome)/multiplier/coefficient);return{type,needed}})
}
function replacementOwnership(d,variant,p,target){
  const placedByKey=new Map(p.placed.map(x=>[replacementKey(x),x])),units=expandedOwned().filter(x=>x.name===d.name),requiredRank=variantRank(variant),suitable=units.filter(x=>variantRank(x.variant)>=requiredRank&&replacementKey(x)!==replacementKey(target)),available=suitable.find(x=>{const placed=placedByKey.get(replacementKey(x));return !placed||!PRODUCTIVE_STATIONS.includes(placed.station)&&!isProtocolStation(placed.station)}),elsewhere=suitable.find(x=>placedByKey.has(replacementKey(x))),best=units.reduce((best,x)=>!best||variantRank(x.variant)>variantRank(best.variant)?x:best,null),dex=state.droidex.some(x=>x.name===d.name&&variantRank(x.variant)>=requiredRank);
  if(available)return{kind:'available',label:`Owned · available (${variantLabel(available.variant)})`,cost:0,best};
  if(elsewhere)return{kind:'placed',label:`Owned · placed in ${placedByKey.get(replacementKey(elsewhere)).station.toLowerCase()}`,cost:0,best};
  if(best&&variantRank(best.variant)<requiredRank)return{kind:'upgrade',label:`Owned ${variantLabel(best.variant)} · upgrade`,cost:chipsToVariant(d,best.variant,variant),best};
  return{kind:'missing',label:dex?'In Droidex · not owned':'Missing',cost:Infinity,best:null}
}
function replacementCandidates(target,p,minimum=0){
  const productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),current=incomeForPlaced(p.placed),remaining=productive.filter(x=>replacementKey(x)!==replacementKey(target)),remainingBase=placedBaseIncome(remaining),targetLoss=current-incomeForPlaced([...remaining,...p.placed.filter(x=>isProtocolStation(x.station))]);
  const variants=state.droids.flatMap(d=>Object.keys(d.variants||{}).filter(v=>OWNED_VARIANTS.includes(v)&&(isIconic(d)?v==='DEFAULT':true)).map(variant=>{
    const candidate={name:d.name,variant,station:target.station,slot:target.slot},nextIncome=incomeForPlaced([...remaining,candidate,...p.placed.filter(x=>isProtocolStation(x.station))]),gain=nextIncome-current,base=d.variants[variant]?.income||0,ownership=replacementOwnership(d,variant,p,target);
    return{...candidate,droid:d,nextIncome,gain,hourGain:gain*3600,base,adjusted:droidRate(d,variant,target.station,remainingBase)*protocolRegionMultiplier(p.placed,target.station),ownership}
  })).filter(x=>x.gain>0&&x.gain/Math.max(targetLoss,1)*100>=minimum).sort((a,b)=>a.name.localeCompare(b.name)||variantRank(a.variant)-variantRank(b.variant));
  const firstByDroid=new Map();
  for(const row of variants)if(!firstByDroid.has(row.name))firstByDroid.set(row.name,row);
  return[...firstByDroid.values()].map(row=>({...row,variantPlus:!isIconic(row.droid)&&variantRank(row.variant)<VARIANTS.length-1}))
}
function replacementSort(rows,sort){
  const upgradeCost=x=>Number.isFinite(x.ownership.cost)?x.ownership.cost:Number.MAX_SAFE_INTEGER;
  return rows.sort((a,b)=>sort==='cost'?upgradeCost(a)-upgradeCost(b)||b.hourGain-a.hourGain:sort==='efficiency'?(b.hourGain/Math.max(upgradeCost(b),1))-(a.hourGain/Math.max(upgradeCost(a),1)):sort==='rarity'?rarityRank(a.droid)-rarityRank(b.droid)||b.hourGain-a.hourGain:sort==='alpha'?a.name.localeCompare(b.name)||variantRank(a.variant)-variantRank(b.variant):b.hourGain-a.hourGain)
}
function legacyBaseHealthCheckHtml(p){
  const allTargets=productiveReplacementTargets(p,replacementSettings().protect),weakest=allTargets[0],protectedKeys=rebirthProtectedKeys(p),productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),misplaced=productive.filter(x=>{const d=state.droids.find(y=>y.name===x.name);return d&&!isIconic(d)&&PRODUCTIVE_STATIONS.includes(d.type)&&d.type!==x.station}).map(x=>{const d=state.droids.find(y=>y.name===x.name),gain=(d.variants[x.variant]?.income||0)*effectiveMultiplier()*.1;return{x,d,gain}}).sort((a,b)=>b.gain-a.gain)[0],empty=PRODUCTIVE_STATIONS.reduce((sum,station)=>sum+capacity(station)-productive.filter(x=>x.station===station).length,0);
  return `<section class="base-health"><header><div><p class="eyebrow">Base health check</p><h2>At a glance</h2></div><span>${productive.length} productive droid${productive.length===1?'':'s'}</span></header><div class="base-health-grid"><button data-health-target="${weakest?replacementKey(weakest):''}" ${weakest?'':'disabled'}><small>Weakest earner</small><strong>${weakest?weakest.name:'None'}</strong><span>${weakest?`${fmt(weakest.adjusted)}/s · ${weakest.station} ${weakest.slot+1}`:'No productive droids'}</span></button><div><small>Largest misplaced droid</small><strong>${misplaced?misplaced.d.name:'None'}</strong><span>${misplaced?`${misplaced.x.station} · +${fmt(misplaced.gain*3600)}/h if matched`:'Every droid is type-matched'}</span></div><div><small>Empty productive slots</small><strong>${empty}</strong><span>Worker, Astromech and Battle</span></div><div><small>Protected rebirth droids</small><strong>${protectedKeys.size}</strong><span>Through Rebirth ${rebirthGoal()}</span></div></div></section>`
}
function legacyReplacementCalculatorHtml(p){
  const settings=replacementSettings(),targets=productiveReplacementTargets(p,settings.protect),target=targets.find(x=>replacementKey(x)===settings.target)||targets[0],thresholds=target?replacementThresholds(target,p):[],rows=target?replacementSort(replacementCandidates(target,p,settings.minimum),settings.sort):[];
  if(target)localStorage.setItem('droid-archive-replacement-target',replacementKey(target));
  return `<section class="replacement-calculator"><header><div><p class="eyebrow">Base calculator</p><h2>Droid Replacement Calculator</h2><p>Find the base income a droid needs to improve a productive station.</p></div><button class="btn secondary" id="compareDroids">Compare two droids</button></header><div class="replacement-controls"><label class="replacement-protect"><input type="checkbox" id="replacementProtect" ${settings.protect?'checked':''}> Protect rebirth droids</label><label>Replacement target<select id="replacementTarget" class="form-control">${targets.map(x=>`<option value="${replacementKey(x)}" ${replacementKey(x)===replacementKey(target)?'selected':''}>${x.name} ${variantLabel(x.variant)} · ${x.station} ${x.slot+1}</option>`).join('')}</select></label><label>Sort results<select id="replacementSort" class="form-control"><option value="gain" ${settings.sort==='gain'?'selected':''}>Largest credit increase</option><option value="cost" ${settings.sort==='cost'?'selected':''}>Lowest upgrade cost</option><option value="efficiency" ${settings.sort==='efficiency'?'selected':''}>Best gain per upgrade chip</option><option value="rarity" ${settings.sort==='rarity'?'selected':''}>Lowest rarity</option><option value="alpha" ${settings.sort==='alpha'?'selected':''}>Alphabetical</option></select></label><label>Minimum improvement<input id="replacementMinimum" class="form-control" type="number" min="0" step="1" value="${settings.minimum}"><span>%</span></label><button class="btn" id="displayReplacementDroids">${settings.display?'Hide droids':'Display Droids'}</button></div>${target?`<div class="replacement-target"><div class="replacement-target-card">${picture(target.droid,target.variant)}<span><small>Current weakest replaceable droid</small><strong>${target.name} ${variantText(target.variant)}</strong><em>${target.station} station · slot ${target.slot+1}</em></span></div><dl><div><dt>Base income</dt><dd>${isIconic(target.droid)?`${Math.round(iconicIncome(target.droid)*100)}%/s`:`${fmt(target.base)}/s`}</dd></div><div><dt>Adjusted income</dt><dd>${fmt(target.adjusted)}/s</dd></div><div><dt>Credits / hour</dt><dd>${fmt(target.hour)}</dd></div></dl></div><div class="replacement-thresholds">${thresholds.map(x=>`<div><span>${stationIcon(x.type)}<small>${x.type[0]+x.type.slice(1).toLowerCase()} droid</small></span><strong>${fmt(x.needed)}/s base</strong><em>${x.type===target.station?'+10% station match':'No station match'}</em></div>`).join('')}</div>${settings.display?`<div class="replacement-results-head"><strong>${rows.length} improving droid variant${rows.length===1?'':'s'}</strong><span>Compared with ${target.name} in ${target.station} ${target.slot+1}</span></div><div class="replacement-results">${rows.map(x=>`<article class="replacement-result replacement-${x.ownership.kind}"><a href="#/droid/${slug(x.name)}">${picture(x.droid,x.variant)}<span><strong>${x.name}</strong><small>${variantText(x.variant)} · ${rarityText(x.droid.rarity)}</small></span></a><dl><div><dt>Base</dt><dd>${isIconic(x.droid)?`${Math.round(iconicIncome(x.droid)*100)}%/s`:`${fmt(x.base)}/s`}</dd></div><div><dt>Adjusted</dt><dd>${fmt(x.adjusted)}/s</dd></div><div><dt>Gain / hour</dt><dd>+${fmt(x.hourGain)}</dd></div><div><dt>Upgrade cost</dt><dd>${Number.isFinite(x.ownership.cost)?`${fmt(x.ownership.cost)} chips`:'—'}</dd></div></dl><footer><span>${x.ownership.label}</span><a href="#/droid/${slug(x.name)}">Wiki page →</a></footer></article>`).join('')||'<div class="empty">No droid variants beat this target by the selected minimum improvement.</div>'}</div>`:''}`:'<div class="empty">There are no replaceable productive droids with the current protection setting.</div>'}</section>`
}
function baseHealthCheckHtml(p){
  const allTargets=productiveReplacementTargets(p,replacementSettings().protect),weakest=allTargets[0],protectedKeys=rebirthProtectedKeys(p),productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),misplaced=productive.filter(x=>{const d=state.droids.find(y=>y.name===x.name);return d&&!isIconic(d)&&PRODUCTIVE_STATIONS.includes(d.type)&&d.type!==x.station}).map(x=>{const d=state.droids.find(y=>y.name===x.name),gain=(d.variants[x.variant]?.income||0)*effectiveMultiplier()*.1;return{x,d,gain}}).sort((a,b)=>b.gain-a.gain)[0],empty=PRODUCTIVE_STATIONS.reduce((sum,station)=>sum+capacity(station)-productive.filter(x=>x.station===station).length,0);
  return `<section class="base-health"><header><div><p class="eyebrow">Base health check</p><h2>At a glance</h2></div><span>${productive.length} productive droid${productive.length===1?'':'s'}</span></header><div class="base-health-grid"><div><small>Weakest replaceable earner</small><strong>${weakest?weakest.name:'None'}</strong><span>${weakest?`${fmt(weakest.adjusted)}/s &middot; ${weakest.station} ${weakest.slot+1}`:'No productive droids'}</span></div><div><small>Largest misplaced droid</small><strong>${misplaced?misplaced.d.name:'None'}</strong><span>${misplaced?`${misplaced.x.station} &middot; +${fmt(misplaced.gain*3600)}/h if matched`:'Every droid is type-matched'}</span></div><div><small>Empty productive slots</small><strong>${empty}</strong><span>Worker, Astromech and Battle</span></div><div><small>Protected rebirth droids</small><strong>${protectedKeys.size}</strong><span>Through Rebirth ${rebirthGoal()}</span></div></div></section>`
}
function replacementCalculatorHtml(p,{manual=false}={}){
  const settings=replacementSettings(),targets=productiveReplacementTargets(p,settings.protect),target=manual?(targets.find(x=>replacementKey(x)===settings.target)||targets[0]):targets[0],thresholds=target?replacementThresholds(target,p):[],minimum=settings.minimumEnabled?settings.minimum:0,rows=target?replacementSort(replacementCandidates(target,p,minimum),settings.sort):[];
  if(manual&&target)localStorage.setItem('droid-archive-replacement-target',replacementKey(target));
  const targetPicker=manual?`<label>Replacement target<select id="replacementTarget" class="form-control">${targets.map(x=>`<option value="${replacementKey(x)}" ${replacementKey(x)===replacementKey(target)?'selected':''}>${x.name} ${variantLabel(x.variant)} &middot; ${x.station} ${x.slot+1}</option>`).join('')}</select></label>`:'';
  const resultCards=settings.view==='compact'?rows.map(x=>`<a class="replacement-compact-card replacement-${x.ownership.kind}" href="#/droid/${slug(x.name)}">${picture(x.droid,x.variant)}<span><strong>${x.name}</strong><small>${variantText(x.variant)}${x.variantPlus?'+':''}</small></span><span><small>Base income</small><b>${isIconic(x.droid)?`${Math.round(iconicIncome(x.droid)*100)}%/s`:`${fmt(x.base)}/s`}</b></span></a>`).join(''):rows.map(x=>{const scrapGain=scrapPayoutsForIncome(x.gain);return `<article class="replacement-result replacement-${x.ownership.kind}"><a href="#/droid/${slug(x.name)}">${picture(x.droid,x.variant)}<span><strong>${x.name}</strong><small>${variantText(x.variant)}${x.variantPlus?'+':''}</small><em>${rarityText(x.droid.rarity)}</em></span></a><dl><div><dt>Base</dt><dd>${isIconic(x.droid)?`${Math.round(iconicIncome(x.droid)*100)}%/s`:`${fmt(x.base)}/s`}</dd></div><div><dt>Adjusted</dt><dd>${fmt(x.adjusted)}/s</dd></div><div><dt>Gain / hour</dt><dd>+${fmt(x.hourGain)}</dd></div><div><dt>Upgrade cost</dt><dd>${Number.isFinite(x.ownership.cost)?`${fmt(x.ownership.cost)} chips`:'&mdash;'}</dd></div><div><dt>Scrap / hit</dt><dd>${scrapGain.hit?`+${fmt(scrapGain.hit)}`:'&mdash;'}</dd></div><div><dt>Scrap / break</dt><dd>${scrapGain.break?`+${fmt(scrapGain.break)}`:'&mdash;'}</dd></div></dl><footer><span>${x.ownership.label}</span><a href="#/droid/${slug(x.name)}">Wiki page &rarr;</a></footer></article>`}).join('');
  return `<section class="replacement-calculator"><header><div><p class="eyebrow">Base calculator</p><h2>Droid Replacement Calculator</h2><p>${manual?'Choose any productive card and compare every practical replacement.':'Automatically checks the weakest eligible earner in your productive Base.'}</p></div><div class="replacement-header-actions">${manual?'':`<a class="btn secondary" href="#/droid-calc">Open Droid Calc</a>`}<button class="btn secondary" id="compareDroids">Compare two droids</button></div></header><div class="replacement-controls ${manual?'manual':'automatic'}"><label class="replacement-protect"><input type="checkbox" id="replacementProtect" ${settings.protect?'checked':''}> Protect rebirth droids</label>${targetPicker}<label>Sort results<select id="replacementSort" class="form-control"><option value="gain" ${settings.sort==='gain'?'selected':''}>Largest credit increase</option><option value="cost" ${settings.sort==='cost'?'selected':''}>Lowest upgrade cost</option><option value="efficiency" ${settings.sort==='efficiency'?'selected':''}>Best gain per upgrade chip</option><option value="rarity" ${settings.sort==='rarity'?'selected':''}>Lowest rarity</option><option value="alpha" ${settings.sort==='alpha'?'selected':''}>Alphabetical</option></select></label><label class="replacement-minimum"><span><input type="checkbox" id="replacementMinimumEnabled" ${settings.minimumEnabled?'checked':''}> Minimum improvement</span><span><input id="replacementMinimum" class="form-control" type="number" min="0" step="1" value="${settings.minimum}" ${settings.minimumEnabled?'':'disabled'}><b>%</b></span></label><button class="btn" id="displayReplacementDroids">${settings.display?'Hide droids':'Display Droids'}</button></div>${target?`<div class="replacement-target"><div class="replacement-target-card">${picture(target.droid,target.variant)}<span><small>${manual?'Selected replacement target':'Current weakest replaceable droid'}</small><strong>${target.name} ${variantText(target.variant)}</strong><em>${target.station} station &middot; slot ${target.slot+1}</em></span></div><dl><div><dt>Base income</dt><dd>${isIconic(target.droid)?`${Math.round(iconicIncome(target.droid)*100)}%/s`:`${fmt(target.base)}/s`}</dd></div><div><dt>Adjusted income</dt><dd>${fmt(target.adjusted)}/s</dd></div><div><dt>Credits / hour</dt><dd>${fmt(target.hour)}</dd></div></dl></div><div class="replacement-threshold-intro"><strong>Break-even base income for ${target.station} ${target.slot+1}</strong><span>A replacement must exceed the shown value. A lower requirement means that candidate receives the station-match bonus.</span></div><div class="replacement-thresholds">${thresholds.map(x=>`<div><span>${stationIcon(x.type)}<small>${x.type[0]+x.type.slice(1).toLowerCase()} candidate</small></span><strong>Must exceed ${fmt(x.needed)}/s</strong><em>${x.type===target.station?'Receives +10% match bonus in this slot':'Receives no match bonus in this slot'}</em></div>`).join('')}</div>${settings.display?`<div class="replacement-results-head"><div><strong>${rows.length} improving droid${rows.length===1?'':'s'}</strong><span>Compared with ${target.name} in ${target.station} ${target.slot+1}</span></div><div class="replacement-view-toggle"><button data-replacement-view="compact" class="${settings.view==='compact'?'active':''}">Compact</button><button data-replacement-view="detailed" class="${settings.view==='detailed'?'active':''}">Detailed</button></div></div><div class="replacement-results ${settings.view}">${resultCards||`<div class="empty">No droids beat this target${settings.minimumEnabled?` by at least ${settings.minimum}%`:''}.</div>`}</div>`:''}`:'<div class="empty">There are no replaceable productive droids with the current protection setting.</div>'}</section>`
}
function attachReplacementCalculator(render){
  const rerender=()=>{const y=scrollY;render();requestAnimationFrame(()=>scrollTo(0,y))},set=(key,value)=>localStorage.setItem(key,String(value));
  document.querySelector('#replacementProtect')?.addEventListener('change',e=>{set('droid-archive-replacement-protect',e.target.checked?'1':'0');rerender()});
  document.querySelector('#replacementTarget')?.addEventListener('change',e=>{set('droid-archive-replacement-target',e.target.value);rerender()});
  document.querySelector('#replacementSort')?.addEventListener('change',e=>{set('droid-archive-replacement-sort',e.target.value);rerender()});
  document.querySelector('#replacementMinimumEnabled')?.addEventListener('change',e=>{set('droid-archive-replacement-minimum-enabled',e.target.checked?'1':'0');rerender()});
  document.querySelector('#replacementMinimum')?.addEventListener('change',e=>{set('droid-archive-replacement-minimum',Math.max(0,Number(e.target.value)||0));rerender()});
  document.querySelector('#displayReplacementDroids')?.addEventListener('click',()=>{set('droid-archive-replacement-display',replacementSettings().display?'0':'1');rerender()});
  document.querySelectorAll('[data-replacement-view]').forEach(button=>button.addEventListener('click',()=>{set('droid-archive-replacement-view',button.dataset.replacementView);rerender()}));
  document.querySelector('#compareDroids')?.addEventListener('click',()=>showDroidComparisonModal());
}
function comparisonRate(d,variant,station){return droidRate(d,variant,station,isIconic(d)?placedBaseIncome(placements().placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station))):0)}
function comparisonDroidHtml(d){const variants=Object.keys(d.variants||{}).filter(v=>OWNED_VARIANTS.includes(v)&&(isIconic(d)?v==='DEFAULT':true));return `<section class="comparison-droid"><header>${picture(d,variants.at(-1)||'DEFAULT')}<div><h3>${d.name}</h3><span>${rarityText(d.rarity)} · ${d.type}</span></div></header><div class="comparison-table-wrap"><table><thead><tr><th>Variant</th><th>Base</th>${PRODUCTIVE_STATIONS.map(x=>`<th>${x[0]+x.slice(1).toLowerCase()}</th>`).join('')}</tr></thead><tbody>${variants.map(v=>`<tr><th>${variantText(v)}</th><td>${isIconic(d)?`${Math.round(iconicIncome(d)*100)}%/s`:`${fmt(d.variants[v]?.income||0)}/s`}</td>${PRODUCTIVE_STATIONS.map(station=>`<td>${fmt(comparisonRate(d,v,station))}/s</td>`).join('')}</tr>`).join('')}</tbody></table></div><a href="#/droid/${slug(d.name)}">Open wiki page →</a></section>`}
function showDroidComparisonModal(){const root=document.querySelector('#modalRoot'),options=state.droids.map(d=>`<option value="${d.name}">${d.name}</option>`).join(''),draw=(a,b)=>{const first=state.droids.find(d=>d.name===a)||state.droids[0],second=state.droids.find(d=>d.name===b)||state.droids[1]||first;root.innerHTML=`<div class="modal-backdrop"><section class="modal comparison-modal" role="dialog" aria-modal="true"><header><div><p class="eyebrow">Base comparison</p><h2>Compare droids</h2><p>Adjusted values use your current multiplier and each possible station match. Iconic rows show what their percentage earns from your Base income.</p></div><button class="icon-btn" id="closeComparison" aria-label="Close">×</button></header><div class="comparison-selects"><label>Droid one<select id="comparisonOne" class="form-control">${options}</select></label><span>versus</span><label>Droid two<select id="comparisonTwo" class="form-control">${options}</select></label></div><div class="comparison-grid">${comparisonDroidHtml(first)}${comparisonDroidHtml(second)}</div></section></div>`;root.querySelector('#comparisonOne').value=first.name;root.querySelector('#comparisonTwo').value=second.name;root.querySelector('#comparisonOne').onchange=e=>draw(e.target.value,root.querySelector('#comparisonTwo').value);root.querySelector('#comparisonTwo').onchange=e=>draw(root.querySelector('#comparisonOne').value,e.target.value);root.querySelector('#closeComparison').onclick=()=>root.innerHTML=''};draw(state.droids[0]?.name,state.droids[1]?.name)}
function attachCollapsiblePanels(){
  const actions=document.querySelector('.base-actions');
  const hasGroupOutlook=Boolean(document.querySelector('.group-outlook-panel'));
  const hasFusionOutlook=Boolean(document.querySelector('.fusion-outlook'));
  // The modern UI adds the icon itself from the button's text, via
  // modernButtonIcon, so this must not carry one of its own or it gets two.
  if(actions)actions.innerHTML=`<button class="btn secondary base-panel-toggle ${baseViewIsMap()?'active':''}" id="toggleBaseMap">${baseViewIsMap()?'Hide Map':'Show Map'}</button><button class="btn secondary base-panel-toggle" id="toggleHealthPanel">Hide Health</button>${partyToggleButtonHtml()}<button class="btn secondary base-panel-toggle" id="toggleScrapPanel">Hide Scrap</button><button class="btn secondary base-panel-toggle" id="toggleChipSellPanel">Hide Rebirth Prep</button><button class="btn secondary base-panel-toggle" id="toggleReplacementPanel">Hide Droid Calc</button><button class="btn secondary base-panel-toggle" id="toggleOutlookPanel">Hide Rebirth Outlook</button><button class="btn secondary base-panel-toggle" id="toggleNotificationsPanel">Hide Notifications</button>${hasGroupOutlook?'<button class="btn secondary base-panel-toggle" id="toggleGroupOutlookPanel">Hide Group Outlook</button>':''}${hasFusionOutlook?'<button class="btn secondary base-panel-toggle" id="toggleFusionOutlookPanel">Hide Fusion</button>':''}<button class="btn secondary base-panel-toggle" id="toggleCraftingPanel">Hide Crafting</button><button class="btn secondary base-panel-toggle" id="toggleBaseDetail">Hide Detail</button><button class="btn secondary" id="fusionMine" title="The Fusion droids your own droids can make">My fusions</button><button class="btn secondary" id="transferBase" title="Import or export Base" aria-label="Import or export Base"><span class="btn-label">Import / Export</span></button>`;
  document.querySelectorAll('.slot-replacement-target').forEach(button=>button.remove());
  const outlook=document.querySelector('.rebirth-summary-box'),next=outlook?.querySelector('.outlook-next'),viewRebirths=outlook?.querySelector(':scope > a.btn');
  if(next&&viewRebirths){const label=next.querySelector(':scope > .outlook-label'),row=document.createElement('div');row.className='outlook-next-title';label?.before(row);if(label)row.append(label);row.append(viewRebirths)}
  [{selector:'.crafting-summary',button:'#toggleCraftingPanel',key:'droid-archive-crafting-collapsed',label:'Crafting'},
   {selector:'.notification-panel',button:'#toggleNotificationsPanel',key:'droid-archive-notifications-collapsed',label:'Notifications'},
   {selector:'.fusion-outlook',button:'#toggleFusionOutlookPanel',key:'droid-archive-fusion-outlook-collapsed',label:'Fusion'},
   {selector:'.base-health',button:'#toggleHealthPanel',key:'droid-archive-health-collapsed',label:'Health'},{selector:'.scrap-calculator:not(.chip-sell-calculator)',button:'#toggleScrapPanel',key:'droid-archive-scrap-collapsed',label:'Scrap'},{selector:'.chip-sell-calculator',button:'#toggleChipSellPanel',key:'droid-archive-chip-sell-collapsed',label:'Rebirth Prep'},{selector:'.replacement-calculator',button:'#toggleReplacementPanel',key:'droid-archive-replacement-collapsed',label:'Droid Calc',defaultCollapsed:true},{selector:'.rebirth-summary-box',button:'#toggleOutlookPanel',key:'droid-archive-rebirth-outlook-collapsed',label:'Rebirth Outlook'},{selector:'.group-outlook-panel',button:'#toggleGroupOutlookPanel',key:`droid-archive-group-outlook-collapsed:${state.cloud.user?.id||'local'}`,label:'Group Outlook'}].forEach(item=>{const panel=document.querySelector(item.selector),button=document.querySelector(item.button);if(!button)return;if(!panel){button.remove();return;}const update=collapsed=>{panel.classList.toggle('collapsed',collapsed);if(item.label==='Crafting')panel.hidden=collapsed;button.classList.toggle('active',!collapsed);button.textContent=`${collapsed?'Show':'Hide'} ${item.label}`;button.title=`${collapsed?'Show':'Hide'} ${item.label}`;button.setAttribute('aria-expanded',String(!collapsed));if(item.label==='Notifications')button.innerHTML=commandIcon('notifications')+' '+(document.documentElement.dataset.uiStyle==='modern'?'Notifications':button.textContent);if(['modern','next'].includes(document.documentElement.dataset.uiStyle))requestAnimationFrame(()=>decorateCommandDeck('/base'))},stored=localStorage.getItem(item.key);update(stored===null?Boolean(item.defaultCollapsed):stored==='1');button.onclick=()=>{const collapsed=!panel.classList.contains('collapsed');localStorage.setItem(item.key,collapsed?'1':'0');update(collapsed)}});
  const detailButton=document.querySelector('#toggleBaseDetail'),layout=document.querySelector('.base-layout-v2'),detailKey='droid-archive-base-detail-hidden';
  if(detailButton&&layout){const update=hidden=>{layout.classList.toggle('base-details-hidden',hidden);detailButton.classList.toggle('active',!hidden);detailButton.textContent=hidden?'Show Detail':'Hide Detail';detailButton.title=hidden?'Show full droid card details':'Use compact droid cards';detailButton.setAttribute('aria-pressed',String(!hidden));if(['modern','next'].includes(document.documentElement.dataset.uiStyle))requestAnimationFrame(()=>decorateCommandDeck('/base'))};update(localStorage.getItem(detailKey)==='1');detailButton.onclick=()=>{const hidden=!layout.classList.contains('base-details-hidden');localStorage.setItem(detailKey,hidden?'1':'0');update(hidden)}}
  document.querySelector('#chooseBaseGroupProfiles')?.addEventListener('click',showBaseGroupProfilePicker);
  attachOutlookVariantControls()
}
function setNovaLevel(id,level,notify=true){const upgrade=novaUpgrade(id);if(!upgrade||upgrade.comingSoon)return;const max=upgrade.uncapped?Infinity:upgrade.levels.length,min=minimumNovaLevel(id);state.novaUpgrades[id]=Math.max(min,Math.min(max,Number.isFinite(Number(level))?Math.floor(Number(level)):0));if(id==='lounge-slot')state.loungePurchased=state.novaUpgrades[id];save();if(notify)toast(`${upgrade.name} set to level ${state.novaUpgrades[id]}`)}
function legacyNovaShopPage(){let category='featured';const render=()=>{const shop=state.novaShop;if(!shop){app.innerHTML='<h1>Nova Shop unavailable</h1>';return}const list=shop.upgrades.filter(x=>category==='all'||x.category===category);app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Nova Shop</div><section class="nova-hero"><div><p class="eyebrow">Nova upgrades</p><h1>Nova Shop</h1><p class="lead">Track Nova Crystal upgrades, costs, and unlocks. Upgrade levels are saved with your profile.</p></div><div class="nova-currency"><img src="${shop.currency.icon}" alt=""><strong>${shop.currency.name}s</strong></div></section><div class="variant-tabs nova-tabs"><button data-nova-cat="all" class="${category==='all'?'active':''}">All</button>${shop.categories.map(c=>`<button data-nova-cat="${c.id}" class="${category===c.id?'active':''}">${c.name}</button>`).join('')}</div><div class="nova-grid">${list.map(u=>{const level=novaLevelFor(u.id),next=u.levels[level]||{level:level+1,cost:null,unknown:true},done=!u.uncapped&&level>=u.levels.length,coming=Boolean(u.comingSoon);return `<article class="nova-card ${u.category==='featured'?'featured-upgrade':''} ${coming?'coming-soon':''}"><a href="#/nova-shop/${u.id}"><span class="nova-card-icon">${u.icon}</span><small>${shop.categories.find(c=>c.id===u.category)?.name||u.category}</small><strong>${u.name}</strong><em>${coming?'Soon':`${level}/${u.uncapped?'∞':u.levels.length}`}</em><p>${u.description}</p></a><div><button class="btn secondary" data-nova-dec="${u.id}" ${level<=0||coming?'disabled':''}>−</button><span>${coming?'Coming Soon':done?'Maxed':novaCost(next)}</span><button class="btn" data-nova-inc="${u.id}" ${coming||done?'disabled':''}>+</button></div></article>`}).join('')}</div>${novaRebirthRewardsHtml(shop)}`;document.querySelectorAll('[data-nova-cat]').forEach(b=>b.onclick=()=>{category=b.dataset.novaCat;render()});document.querySelectorAll('[data-nova-inc]').forEach(b=>b.onclick=()=>{setNovaLevel(b.dataset.novaInc,novaLevelFor(b.dataset.novaInc)+1);render()});document.querySelectorAll('[data-nova-dec]').forEach(b=>b.onclick=()=>{setNovaLevel(b.dataset.novaDec,novaLevelFor(b.dataset.novaDec)-1);render()})};render()}
function legacyNovaDetailPage(id){const u=novaUpgrade(id);if(!u){notFound();return}const category=state.novaShop.categories.find(c=>c.id===u.category)?.name||u.category,level=novaLevelFor(u.id),knownTotal=u.levels.reduce((s,x)=>s+(Number(x.cost)||0),0),spent=u.levels.slice(0,Math.min(level,u.levels.length)).reduce((s,x)=>s+(Number(x.cost)||0),0),next=u.levels[level]||{level:level+1,cost:null,unknown:true},done=!u.uncapped&&level>=u.levels.length,coming=Boolean(u.comingSoon);app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / <a href="#/nova-shop">Nova Shop</a> / ${u.name}</div><div class="article-grid"><article><p class="eyebrow">${category}</p><h1>${u.name}</h1><p class="lead">${u.description}</p><div class="base-top"><div class="stat"><small>Current level</small><strong>${coming?'Soon':`${level}/${u.uncapped?'∞':u.levels.length}`}</strong></div><div class="stat"><small>Known spent</small><strong>${fmt(spent)}</strong></div><div class="stat"><small>Known total</small><strong>${coming?'Coming Soon':u.uncapped?`${fmt(knownTotal)}+`:fmt(knownTotal)}</strong></div><div class="stat"><small>Next cost</small><strong>${coming?'Coming Soon':done?'Maxed':next.cost===null?'Unknown':fmt(next.cost)}</strong></div></div><h2>Upgrade costs</h2><table><thead><tr><th>Level</th><th>Nova Crystal cost</th><th>Running total</th></tr></thead><tbody>${u.levels.map((x,i)=>`<tr class="${i<level?'selected-variant':''}"><td>${x.level}</td><td>${novaCost(x)}</td><td>${fmt(u.levels.slice(0,i+1).reduce((s,y)=>s+(Number(y.cost)||0),0))}</td></tr>`).join('')}${u.uncapped?`<tr><td>${u.levels.length+1}+</td><td>Cost unknown</td><td>${fmt(knownTotal)}+</td></tr>`:''}${coming?'<tr><td colspan="3">Coming Soon</td></tr>':''}</tbody></table><div class="modal-actions"><button class="btn secondary" id="novaDown" ${level<=0||coming?'disabled':''}>Decrease level</button><button class="btn" id="novaUp" ${coming||done?'disabled':''}>Increase level</button></div></article><aside class="infobox nova-info"><div class="info-title">${u.name}</div><div class="nova-big-icon">${u.icon}</div><div class="info-rows"><div class="info-row"><b>Category</b><span>${category}</span></div><div class="info-row"><b>Level</b><span>${coming?'Coming Soon':`${level}/${u.uncapped?'∞':u.levels.length}`}</span></div><div class="info-row"><b>Currency</b><span>${state.novaShop.currency.name}</span></div><div class="info-row"><b>Source</b><span>Nova Shop</span></div></div></aside></div>`;document.querySelector('#novaUp').onclick=()=>{setNovaLevel(u.id,level+1);novaDetailPage(id)};document.querySelector('#novaDown').onclick=()=>{setNovaLevel(u.id,level-1);novaDetailPage(id)}}
function droidsPage(){const q=new URLSearchParams(location.hash.split('?')[1]||'');app.innerHTML=`<div class="breadcrumbs"><a href="#/">Main page</a> / Droids</div><p class="eyebrow">Droidex</p><h1>All droids</h1><p class="lead">The complete archive. Select a droid for its dedicated page and all available quality variants.</p><div class="toolbar"><input id="droidSearch" placeholder="Filter by name…"><select id="typeFilter"><option value="">All types</option>${DROID_TYPES.map(x=>`<option ${q.get('type')===x?'selected':''}>${x}</option>`).join('')}</select><select id="rarityFilter"><option value="">All rarities</option>${['COMMON','RARE','EPIC','LEGENDARY','MYTHIC','ICONIC'].map(x=>`<option>${x}</option>`).join('')}</select></div><p id="resultCount" class="eyebrow"></p><div id="droidGrid" class="droid-grid"></div>`;const draw=()=>{let name=document.querySelector('#droidSearch').value.toLowerCase(),type=document.querySelector('#typeFilter').value,rarity=document.querySelector('#rarityFilter').value;let list=[...state.droids,...COMING_SOON_DROIDS].filter(d=>d.name.toLowerCase().includes(name)&&(!type||d.type===type)&&(!rarity||d.rarity===rarity));document.querySelector('#resultCount').textContent=`${list.length} entries`;document.querySelector('#droidGrid').innerHTML=list.map(card).join('')};['droidSearch','typeFilter','rarityFilter'].forEach(id=>document.querySelector('#'+id).addEventListener('input',draw));draw()}
// Which quality you were looking at, kept per droid for the session. The page
// re-renders for reasons that have nothing to do with you - a cloud change
// landing, the timer strip remounting - and dropping back to Default every time
// made the tabs unusable if you were reading anything else.
const detailVariantChoice=new Map();
const detailOnlySelected=new Map();
// A fusion droid is made, not crafted, so its recipe is the only thing on the
// page that says where it comes from.
function detailFusionHtml(d){
  const recipe=fusionRecipes().find(entry=>entry.name===d.name);
  if(!recipe)return'';
  const need=fusionNeed(recipe);
  const parts=need.parts.map(part=>`<a class="detail-fusion-part ${part.short?'is-short':'is-held'}" href="#/droid/${slug(part.name)}">${escapeAttr(part.name)}${part.need>1?` &times;${part.need}`:''}<em>${part.have}/${part.need}</em></a>`).join('<b>+</b>');
  return `<h2>Fusion recipe</h2>
    <p class="lead">${escapeAttr(d.name)} cannot be crafted. It is fused from three droids, and comes out at the worst quality that went in.</p>
    <div class="detail-fusion ${need.ready?'is-ready':''}">${parts}<span class="detail-fusion-arrow">&rarr;</span><span class="detail-fusion-out">${escapeAttr(d.name)}</span></div>
    <p class="detail-fusion-note">${need.ready?'You hold all three.':`Still short ${need.missing.map(part=>`${part.short} &times; ${escapeAttr(part.name)}`).join(', ')}.`} <a href="#/fusion-lab">Fusion Lab</a></p>`;
}
function detailPage(id){
  const upcoming=COMING_SOON_DROIDS.find(x=>slug(x.name)===id);
  if(upcoming){
    let variant=detailVariantChoice.get(upcoming.name)||'DEFAULT';
    if(!upcoming.variants.includes(variant))variant='DEFAULT';
    const render=()=>{app.innerHTML=comingSoonDetail(upcoming,variant,variantText);document.querySelectorAll('[data-upcoming-variant]').forEach(button=>button.onclick=()=>{variant=button.dataset.upcomingVariant;detailVariantChoice.set(upcoming.name,variant);render()})};
    render();return;
  }
  const d=state.droids.find(x=>slug(x.name)===id);
  if(!d){notFound();return}
  const qualities=onlyDefaultVariant(d)?['DEFAULT']:DISPLAY_VARIANTS.filter(x=>d.variants[x]);
  let variant=detailVariantChoice.get(d.name);
  if(!qualities.includes(variant))variant=qualities[0]||'DEFAULT';
  const render=()=>{
    detailVariantChoice.set(d.name,variant);
    const only=detailOnlySelected.get(d.name)===true;
    const v=d.variants[variant]||d.variants.DEFAULT,attribute=droidAttribute(d,variant),chips=upgradeChipRate(d,variant);
    const flawless=isDroidFlawless(d.name);
    // Every quality in one table: comparing them was a click each way before.
    const rows=qualities.filter(x=>!only||x===variant).map(x=>{
      const row=d.variants[x],owned=Boolean(droidexEntry(d.name,x));
      return `<tr class="${x===variant?'selected-variant':''} ${owned?'in-droidex':''}" data-row-variant="${x}">
        <td><strong>${variantText(x)}</strong>${owned?'<span class="dex-tick" title="In your Droidex">&#10003;</span>':''}</td>
        <td>${craftTimeText(row.craftingSeconds)}</td><td>${craftTimeText(estimateCraft(d,x,isFusion(d)?'FUSION_BUILD':'BUILD',Math.max(0,PROTOCOL_REGIONS.indexOf(d.type)),placements().placed)?.seconds)}</td><td>${isIconic(d)?'N/A':fmt(row.cost)}</td>
        <td>${isIconic(d)?`${Math.round(iconicIncome(d)*100)}% of Base income`:fmt(row.income)}</td><td>${isIconic(d)?'Depends on your Base':fmt(row.income*3600)}</td></tr>`;
    }).join('');
    const tabs=qualities.map(x=>`<button data-v="${x}" class="${variant===x?'active':''} ${droidexEntry(d.name,x)?'in-droidex':''}" title="${droidexEntry(d.name,x)?`${variantLabel(x)} is in your Droidex`:`${variantLabel(x)} is missing from your Droidex`}">${variantText(x)}</button>`).join('');
    const missing=qualities.filter(x=>!droidexEntry(d.name,x));
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Main page</a> / <a href="#/droids">Droids</a> / ${d.name}</div><div class="article-grid"><article><p class="eyebrow">${rarityText(d.rarity)} ${d.type} droid</p><h1>${d.name}</h1><p class="lead"><strong>${d.name}</strong> is a ${rarityText(d.rarity)} ${d.type.toLowerCase()} droid. Its base form produces ${fmt(d.variants.DEFAULT.income)} credits per second and every quality is catalogued below.</p><div class="variant-tabs">${tabs}</div>
      <div class="variant-dex-line">${qualities.length>1?`<span>${qualities.length-missing.length}/${qualities.length} in your Droidex${missing.length?` &middot; still missing ${missing.map(x=>variantText(x)).join(', ')}`:''}</span>`:'<span></span>'}${qualities.length>1?`<label class="variant-filter"><input type="checkbox" id="onlySelectedVariant" ${only?'checked':''}> Only ${variantText(variant)}</label>`:''}</div>
      <h2>Statistics</h2><p>Base times exclude bonuses. Your passive time uses your saved Base: fusion bonuses for fusion-only droids, otherwise the matching depot (Worker depot for Protocol). Pickaxe hits and critical hits can finish builds sooner.</p><table><thead><tr><th>Variant</th><th>Base craft time</th><th>Your passive time</th><th>Blueprint cost</th><th>Credits / second</th><th>Credits / hour</th></tr></thead><tbody>${rows}</tbody></table>${variant==='SCOURGE'?'<p class="trait-notice">Scourge is an event variant and satisfies all rebirth variant requirements. Table income excludes Hive Mind; your Base calculates its bonus from eligible placed Scourge droids. Portraits are static material approximations using exported game textures. <a href="#/event">Scourge event and rewards</a></p>':''}${kyberDroidDetails(d,fmt)}${detailFusionHtml(d)}${protocolDetailHtml(d)}${droidTraitsHtml(d)}${d.acquisition?`<h3>How to obtain</h3><p>${escapeAttr(d.acquisition.description)}${d.acquisition.obtainFromAstromech?' Also eligible for Astromech blueprint finds.':''} <a href="#/event">Event and reward guide</a></p>`:''}<h2>Gameplay</h2><p class="lead">As a ${d.type.toLowerCase()} droid, ${droidGameplayAttribute(d,variant)} Production shown in the table is before your in-game credit multiplier.</p><div class="detail-actions"><button class="btn" id="addThis">Add ${variantText(variant)} to my base</button><button class="btn secondary" id="addBlueprintThis">Add blueprint</button></div></article><aside class="infobox"><div class="info-title">${d.name}</div><div class="info-image">${picture(d,variant)}</div><div class="info-rows"><div class="info-row"><b>Quality</b><span>${variantText(variant)}</span></div><div class="info-row"><b>Rarity</b><span>${rarityText(d.rarity)}</span></div><div class="info-row"><b>Type</b><span>${d.type}</span></div><div class="info-row"><b>Attribute</b><span>${attribute}</span></div><div class="info-row"><b>Upgrade Chips</b><span>${chips?`${fmt(chips)}/min`:'N/A'}</span></div><div class="info-row"><b>Sells for</b><span>${chipSellValue(d,variant)?`${fmt(chipSellValue(d,variant))} chips${bb8CompanionActive(placements().placed)?` &middot; ${fmt(chipSellValue(d,variant)*2)} with BB-8`:''}`:'N/A'}</span></div><div class="info-row"><b>Base craft time</b><span>${craftTimeText(v.craftingSeconds)}</span></div><div class="info-row"><b>Cost</b><span>${variantCostText(d,variant)}</span></div>${kyberActivationCost(d)!==null?`<div class="info-row"><b>Kyber activation</b><span>${activationCostText(d)}</span></div>`:''}<div class="info-row"><b>Income</b><span>${variantIncomeText(d,variant)}</span></div><div class="info-row"><b>Droidex</b><span>${droidexEntry(d.name,variant)?`Tracked${flawless?' &middot; flawless':''}`:'Not tracked'}</span></div></div></aside></div>`;
    document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{variant=b.dataset.v;render()});
    document.querySelectorAll('[data-row-variant]').forEach(row=>row.onclick=()=>{variant=row.dataset.rowVariant;render()});
    const onlyBox=document.querySelector('#onlySelectedVariant');
    if(onlyBox)onlyBox.onchange=e=>{detailOnlySelected.set(d.name,e.target.checked);render()};
    document.querySelector('#addThis').onclick=()=>requestAdd(d.name,variant);
    if(isComingSoonDroid(d.name)){document.querySelector('#addThis').disabled=true;document.querySelector('#addThis').textContent='Unlocks 31 October at 14:00 UTC';document.querySelector('#addBlueprintThis').disabled=true;setTimeout(()=>{if(location.hash===`#/droid/${slug(d.name)}`)detailPage(slug(d.name));},Math.min(2147483647,Math.max(1,Date.parse(d.availableAt)-Date.now()+50)));}
    document.querySelector('#addBlueprintThis').onclick=()=>addBlueprint(d.name,variant);
  };
  render();
}
function commitOwned(name,variant,qty=1,preferred,preferredSlot){if(isComingSoonDroid(name)){toast('This droid is coming soon');return}const slot=Number(preferredSlot),hasSlot=Number.isInteger(slot),building=BUILDING_STATIONS.includes(preferred)&&!autoCompleteBuilds(),row=state.owned.find(x=>x.name===name&&x.variant===variant&&!x.trait&&x.preferred===preferred&&(!hasSlot||Number(x.preferredSlot)===slot)&&rowIsBuilding(x)===building);row?row.qty+=qty:state.owned.push({name,variant,qty,...(preferred?{preferred,...(hasSlot?{preferredSlot:slot}:{})}:{}),...(preferred==='BUILD'&&!building?{built:true}:{})});
  // A droid still being built is not in the Droidex yet; completing it records it.
  const logged=building?false:recordDroidex(name,variant);
  save();toast(`${name} added to your base${building?' · still building':logged?' and Droidex':''}`)}
function addBlueprint(name,variant,slot){if(isComingSoonDroid(name)){toast('This droid is coming soon');return}variant=baseVariant(variant);const used=new Set(state.blueprints.map(x=>Number(x.slot))),target=Number.isInteger(Number(slot))?Number(slot):Array.from({length:capacity('BLUEPRINT_STORAGE')},(_,i)=>i).find(i=>!used.has(i));if(target===undefined||target<0||target>=capacity('BLUEPRINT_STORAGE')){toast('No Blueprint Storage slot available');return}state.blueprints.push({name,variant,slot:target});save();toast(`${name} blueprint stored`)}
function craftBlueprint(index,onDone,targetSlot){const blueprint=state.blueprints[index];if(!blueprint)return;const occupied=new Set(placements().placed.filter(x=>x.station==='BUILD').map(x=>x.slot)),openSlots=slotFillOrder('BUILD',{station:'BLUEPRINT_STORAGE',slot:Number(blueprint.slot)||0}).filter(i=>!occupied.has(i)),slot=targetSlot===undefined?openSlots[0]:openSlots.find(i=>i===targetSlot);if(slot===undefined){toast('No free Build slot');return}state.blueprints.splice(index,1);const done=autoCompleteBuilds();state.owned.push({name:blueprint.name,variant:blueprint.variant,qty:1,preferred:'BUILD',preferredSlot:slot,...(done?{built:true}:{})});if(done)recordDroidex(blueprint.name,blueprint.variant);save();toast(`${blueprint.name} moved to Build${done?' and completed':' · press ✓ when it finishes building'}`);onDone?.()}
// Finishing a build unlocks the droid: it can be moved, Optimise can use it, and
// it finally counts towards the Droidex.
function completeBuild(source,unit){const p=placements(),indices=materializePlacements(p),row=state.owned[indices.get(`${source}:${unit}`)];if(!row||row.built)return;row.built=true;const logged=recordDroidex(row.name,row.variant);save();toast(`${row.name} finished building${logged?' · added to Droidex':''}`)}
function requestAdd(name,variant,qty=1,onDone){if(isComingSoonDroid(name)){toast('This droid is coming soon');return}const d=state.droids.find(x=>x.name===name),p=placements();const available=capacity(d.type)-p.placed.filter(x=>x.station===d.type).length+capacity('BUILD')-p.placed.filter(x=>x.station==='BUILD').length;if(available>=qty){commitOwned(name,variant,qty);onDone?.();return}showCapacityModal({name,variant,qty,onDone})}
function showCapacityModal(pending){const root=document.querySelector('#modalRoot');const candidates=expandedOwned();root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><p class="eyebrow">Base capacity reached</p><h2>No compatible slots are free</h2><p><strong>${pending.name}</strong> needs a matching type slot or one of the universal Build slots.</p><div class="modal-actions"><button class="btn" id="chooseSwap">Swap a droid</button><button class="btn secondary" id="forceAdd">Force add</button><button class="btn ghost" id="cancelAdd">Cancel</button></div><div id="swapChooser"></div></section></div>`;root.querySelector('#cancelAdd').onclick=()=>root.innerHTML='';root.querySelector('#forceAdd').onclick=()=>{commitOwned(pending.name,pending.variant,pending.qty);root.innerHTML='';pending.onDone?.()};root.querySelector('#chooseSwap').onclick=()=>{root.querySelector('#swapChooser').innerHTML=`<label class="field swap-field">Choose the droid to replace<select id="swapTarget" class="form-control">${candidates.map((x,i)=>`<option value="${x.source}">${x.name} · ${x.variant}</option>`).join('')}</select></label><button class="btn" id="confirmSwap">Confirm swap</button>`;root.querySelector('#confirmSwap').onclick=()=>{const index=Number(root.querySelector('#swapTarget').value),row=state.owned[index];row.qty>1?row.qty--:state.owned.splice(index,1);commitOwned(pending.name,pending.variant,pending.qty);root.innerHTML='';pending.onDone?.()}}}
function basePage(){
  const cycles=Object.keys(state.rebirths);
  const slotCard=(type,index,p)=>{const occupant=p.placed.find(x=>x.station===type&&x.slot===index);if(occupant){const d=state.droids.find(x=>x.name===occupant.name);return `<a class="base-slot occupied" href="#/droid/${slug(d.name)}"><div>${picture(d,occupant.variant)}</div><strong>${d.name}</strong><small>${variantText(occupant.variant)} · ${fmt(d.variants[occupant.variant].income*state.multiplier)}/s</small></a>`}const rule=SLOT_RULES[type],unlock=rule.unlocks[index-rule.initial],isLocked=unlock>state.rebirth;return `<div class="base-slot ${isLocked?'locked':'open'}"><span class="slot-icon">${type==='BUILD'?'⚒':`<img src="${TYPE_IMAGES[type]}" alt="">`}</span><small>${isLocked?`Unlocks at Rebirth ${unlock}`:`${type[0]+type.slice(1).toLowerCase()} slot`}</small></div>`};
  const station=(type,p)=>{const total=SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length;const active=capacity(type);const used=p.placed.filter(x=>x.station===type).length;return `<section class="station station-${type.toLowerCase()}"><header><span>${type==='BUILD'?'⚒':`<img src="${TYPE_IMAGES[type]}" alt="">`}<strong>${type[0]+type.slice(1).toLowerCase()}</strong></span><small>${used}/${active} slots${total-active?` · ${total-active} future`:''}</small></header><div class="slot-grid">${Array.from({length:total},(_,i)=>slotCard(type,i,p)).join('')}</div></section>`};
  const render=()=>{const p=placements();const income=state.owned.reduce((sum,x)=>{const d=state.droids.find(y=>y.name===x.name);return sum+(d?.variants[x.variant]?.income||0)*x.qty},0)*state.multiplier;const future=(state.rebirths[state.cycle]||[]).filter(r=>r.to>state.rebirth).flatMap(r=>r.requiredDroids.map(req=>({...req,at:r.to})));const located=requirementLocations();const futureRows=future.map(req=>{const status=requirementStatus(req,located);return `<div class="future-item ${status.ready?'have':status.needsUpgrade?'upgrade':'missing'}"><b>Rebirth ${req.at}</b><span>${requirementVariantText(req.variant)} <a href="#/droid/${slug(req.droidName)}">${req.droidName}</a>${status.have?`<small>Best owned: ${variantText(status.have)}${status.where?` &middot; ${status.where}`:' &middot; not in your Base'}</small>`:''}</span><span>${requirementNote(status)}</span></div>`}).join('');const roster=state.owned.map((x,i)=>{const d=state.droids.find(y=>y.name===x.name);return `<div class="roster-row"><a href="#/droid/${slug(d.name)}">${picture(d,x.variant)}<span><strong>${d.name}</strong><small>${variantText(x.variant)} · ×${x.qty}</small></span></a><button class="icon-btn remove" data-i="${i}" title="Remove">×</button></div>`}).join('');
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Main page</a> / My base</div><div class="base-heading"><div><p class="eyebrow">Personal planner</p><h1>My base</h1></div><button class="btn" id="openAdd">+ Add droid</button></div><div class="base-top"><div class="stat"><small>Credits / second</small><strong>${fmt(income)}</strong></div><div class="stat"><small>Credits / minute</small><strong>${fmt(income*60)}</strong></div><div class="stat"><small>Credits / hour</small><strong>${fmt(income*3600)}</strong></div><div class="stat"><small>Droids owned</small><strong>${state.owned.reduce((s,x)=>s+x.qty,0)}</strong></div></div><section class="panel base-controls"><label class="field">Credit multiplier<input class="form-control" id="multiplier" type="number" min="0" step="0.1" value="${state.multiplier}"></label><label class="field">Super rebirth cycle<select class="form-control" id="cycle">${cycles.map(c=>`<option value="${c}" ${Number(c)===state.cycle?'selected':''}>Cycle ${Number(c)+1}</option>`).join('')}</select></label><label class="field">Current rebirth<select class="form-control" id="rebirth">${Array.from({length:maxRebirth()+1},(_,n)=>`<option ${n===state.rebirth?'selected':''}>${n}</option>`).join('')}</select></label></section><div class="base-workspace"><div class="station-board">${['WORKER','ASTROMECH','BATTLE','BUILD'].map(t=>station(t,p)).join('')}</div><aside class="roster"><header><strong>Roster</strong><span>${state.owned.reduce((s,x)=>s+x.qty,0)}</span></header>${p.overflow.length?`<div class="overflow-warning">${p.overflow.length} force-added droid${p.overflow.length>1?'s are':' is'} over capacity.</div>`:''}<div>${roster||'<p class="roster-empty">No droids yet. Add one to fill a station.</p>'}</div></aside></div><h2>Needed later in this cycle</h2><div class="notice">Green entries are already in your roster. Requirements begin after your selected current rebirth.</div><div class="future-list">${futureRows||'<div class="empty">Nothing else is required in this cycle.</div>'}</div>`;
    document.querySelector('#multiplier').onchange=e=>{state.multiplier=Math.max(1,Number(e.target.value)||1);save();render()};document.querySelector('#cycle').onchange=e=>{state.cycle=Number(e.target.value);save();render()};document.querySelector('#rebirth').onchange=e=>{state.rebirth=Number(e.target.value);save();render()};document.querySelector('#openAdd').onclick=()=>showAddModal(render);document.querySelectorAll('.remove').forEach(b=>b.onclick=()=>{state.owned.splice(Number(b.dataset.i),1);save();render()})};render()}
function showAddModal(onDone){const root=document.querySelector('#modalRoot');root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><p class="eyebrow">Roster</p><h2>Add a droid</h2><div class="modal-form"><label class="field">Droid<select id="addName" class="form-control">${state.droids.map(d=>`<option>${d.name}</option>`).join('')}</select></label><label class="field" id="addVariantField">Variant<select id="addVariant" class="form-control">${DISPLAY_VARIANTS.map(v=>`<option>${v}</option>`).join('')}</select></label><label class="field">Quantity<input id="addQty" class="form-control" type="number" min="1" value="1"></label></div><div class="modal-actions"><button class="btn" id="confirmAdd">Add to base</button><button class="btn ghost" id="cancelAdd">Cancel</button></div></section></div>`;const syncVariant=()=>{const d=state.droids.find(x=>x.name===root.querySelector('#addName').value),field=root.querySelector('#addVariantField'),select=root.querySelector('#addVariant');if(isIconic(d)){select.value='DEFAULT';field.hidden=true}else field.hidden=false};root.querySelector('#addName').onchange=syncVariant;syncVariant();root.querySelector('#cancelAdd').onclick=()=>root.innerHTML='';root.querySelector('#confirmAdd').onclick=()=>{const d=state.droids.find(x=>x.name===root.querySelector('#addName').value),data={name:root.querySelector('#addName').value,variant:isIconic(d)?'DEFAULT':root.querySelector('#addVariant').value,qty:Math.max(1,Number(root.querySelector('#addQty').value)||1)};root.innerHTML='';requestAdd(data.name,data.variant,data.qty,onDone)}}
function futureRequirements({respectGoal=true}={}){return(state.rebirths[state.cycle]||[]).filter(r=>r.to>state.rebirth&&(!respectGoal||r.to<=rebirthGoal())).flatMap(r=>r.requiredDroids.map(req=>({...req,at:r.to})))}
function bestOwnedVariant(name){let best=null;for(const row of state.owned.filter(x=>x.name===name&&!rowIsBuilding(x))){if(!best||(variantRank(row.variant)>variantRank(best)||isActiveKyber(row.variant)&&!isActiveKyber(best)))best=row.variant}return best}
function hasRequirement(req){const have=bestOwnedVariant(req.droidName);return rebirthVariantReady(have,req.variant)}
function rebirthReadiness(rebirth){const reqs=rebirth?.requiredDroids||[];return reqs.length&&reqs.every(hasRequirement)}
function fullCycleRebirthSummary({respectGoal=false}={}){const cycle=state.rebirths[state.cycle]||[],future=cycle.filter(r=>r.to>state.rebirth&&(!respectGoal||r.to<=rebirthGoal())),ready=future.filter(rebirthReadiness).map(r=>r.to),missing=future.flatMap(r=>(r.requiredDroids||[]).filter(req=>!hasRequirement(req)).map(req=>({...req,at:r.to,droid:state.droids.find(d=>d.name===req.droidName)})));const raritySet=[...new Set(missing.map(x=>x.droid?.rarity).filter(Boolean))],variantSet=[...new Set(missing.map(x=>x.variant))];return{ready,missing,rarities:raritySet,variants:variantSet}}
// What is still outstanding for one requirement: the best copy you own, what
// upgrading it costs, and where that copy is sitting. Shared so the Base's
// "Needed later" list, the Rebirth outlook and the slot cards all agree.
function requirementStatus(req,located){
  const d=state.droids.find(x=>x.name===req.droidName),have=bestOwnedVariant(req.droidName);
  const ready=hasRequirement(req),chips=have&&!ready?chipsToVariant(d,have,req.variant):0;
  // The copy you would actually upgrade is the best one you own.
  const where=(located||requirementLocations()).get(`${req.droidName}:${have}`);
  return{droid:d,have,required:req.variant,ready,chips,needsActivation:activationNeeded(have,req.variant),needsUpgrade:Boolean(have)&&!ready,where};
}
// The best copy of each droid you own, whether it is placed or over capacity.
// The needed-list quality button acts on this card, so it has to be the same
// copy requirementStatus reports as "best owned".
function requirementUnits(p){
  const out=new Map();
  for(const unit of [...(p?.placed||[]),...(p?.overflow||[])]){
    const previous=out.get(unit.name);
    if(!previous||(variantRank(unit.variant)>variantRank(previous.variant)||isActiveKyber(unit.variant)&&!isActiveKyber(previous.variant)))out.set(unit.name,unit);
  }
  return out;
}
// One requirement card, shared by the Base "Needed later" list and the Rebirth
// page. Beyond the requirement itself it answers the three questions asked of
// it: can I add this without scrolling back up, will I need it at a higher
// quality later, and once this rebirth is done can I sell it for the slot.
function neededCardHtml(req,{located,units,rebirth,className=''}={}){
  const d=state.droids.find(x=>x.name===req.droidName);if(!d)return'';
  const at=Number(rebirth??req.at)||0,status=requirementStatus(req,located);
  const peak=requirementPeak(d.name,{after:at-1});
  const laterPeak=peak&&variantRank(peak)>variantRank(req.variant)?peak:null;
  const sellable=!isIconic(d)&&!d.special?.cannotSell&&at>state.rebirth&&requirementFinishesAt(d.name,at);
  const unit=units?.get(d.name);
  const stateClass=status.ready?'have':status.needsUpgrade?'upgrade':'missing';
  // A rebirth already behind you is history: there is nothing to add for it and
  // nothing it can free, so it keeps the plain card it always had.
  const done=at<=state.rebirth;
  // Owned copies get the quality button that the Base slots already use; a droid
  // you do not have yet gets the one-press add instead. The labels stay short
  // because they sit over the corner of a card whose droid name has to stay read.
  const action=done?'':unit&&!isIconic(d)
    ?`<button class="needed-action needed-variant" data-needed-variant-source="${unit.source}" data-needed-variant-name="${escapeAttr(d.name)}" data-needed-variant-current="${unit.variant}" data-needed-variant-station="${escapeAttr(unit.station||'')}" data-needed-variant-slot="${Number(unit.slot)}" title="Change the quality of your ${d.name}" aria-label="Change the quality of your ${d.name}">&#9670;</button>`
    :`<button class="needed-action needed-add" data-needed-add="${escapeAttr(d.name)}" data-needed-add-variant="${req.variant}" title="Add ${d.name} at ${variantLabel(req.variant)} to your Base" aria-label="Add ${d.name} at ${variantLabel(req.variant)} to your Base">+<span>Add</span></button>`;
  return `<article class="${['needed-card',className,stateClass,sellable?'sell-after':''].filter(Boolean).join(' ')}" data-needed-name="${d.name.toLowerCase()}"><a class="needed-card-link" href="#/droid/${slug(d.name)}"><div>${picture(d,req.variant)}</div><span><strong>${d.name}</strong><small>${requirementVariantText(req.variant)}${laterPeak?`<span class="needed-peak"> &rarr; ${requirementVariantText(laterPeak)} later</span>`:''}</small>${requirementWhere(status)}</span><b>${requirementNote(status)}</b></a>${action}${sellable?`<span class="needed-sell" title="Nothing after Rebirth ${at} needs ${d.name}, so it can be sold once this rebirth is done" aria-label="Sellable after Rebirth ${at}">$</span>`:''}</article>`;
}
// Wires the two buttons on a needed card. Called after any render that draws them.
function attachNeededCardHandlers(rerender){
  document.querySelectorAll('[data-needed-add]').forEach(button=>button.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    requestAdd(button.dataset.neededAdd,button.dataset.neededAddVariant,1,rerender);
  });
  document.querySelectorAll('[data-needed-variant-source]').forEach(button=>button.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    showCardVariantModal({source:Number(button.dataset.neededVariantSource),name:button.dataset.neededVariantName,variant:button.dataset.neededVariantCurrent,station:button.dataset.neededVariantStation,slot:Number(button.dataset.neededVariantSlot)},rerender);
  });
}
// Where the best owned copy of each droid is standing, keyed by name:variant.
function requirementLocations(){
  const out=new Map();
  for(const unit of placements().placed){
    const key=`${unit.name}:${unit.variant}`;
    if(!out.has(key))out.set(key,stationSlotLabel(unit.station,unit.slot));
  }
  return out;
}
const requirementNote=status=>status.ready?'&#10003; Ready':status.needsUpgrade?rebirthActionText(status.droid,status.have,status.required,status.chips):'Needed';
const requirementWhere=status=>status.have?`<em>Best owned: ${variantText(status.have)}${status.where?` &middot; ${status.where}`:' &middot; not in your Base'}</em>`:'';
// Every rebirth in this cycle that still wants a given droid, in order. Written
// once because the Base list, the Rebirth page and the sell hints all ask the
// same question: after this rebirth, is this droid finished with?
function requirementSchedule(droidName,{after=-1,through=rebirthGoal()}={}){
  return (state.rebirths[state.cycle]||[]).filter(r=>r.to>after&&r.to<=through)
    .flatMap(r=>(r.requiredDroids||[]).filter(req=>req.droidName===droidName).map(req=>({at:r.to,variant:req.variant})))
    .sort((a,b)=>a.at-b.at);
}
// The highest quality a droid is ever asked for from here on. Knowing you will
// eventually need Beskar saves upgrading to Gold now and again later.
function requirementPeak(droidName,options){
  const schedule=requirementSchedule(droidName,options);
  return schedule.reduce((best,item)=>variantRank(item.variant)>variantRank(best)?item.variant:best,schedule[0]?.variant||null);
}
// After this rebirth, is the droid done? Only then is it safe to sell.
function requirementFinishesAt(droidName,rebirth){
  return !requirementSchedule(droidName,{after:rebirth}).length;
}
const NOVA_ICON='assets/events/nova-crystal.png';
const novaCount=n=>Number(n||0).toLocaleString('en-GB');
const novaAmount=n=>`<span class="nova-amount"><img src="${NOVA_ICON}" alt="" loading="lazy">${novaCount(n)} Nova Crystals</span>`;
const rebirthReward=rebirth=>(state.novaShop?.rebirthRewards||[]).find(r=>Number(r.rebirth)===Number(rebirth))||null;
// Regular Nova is paid on reaching the rank; the SRB payout is a separate choice.
function novaRebirthTotals(rebirth,shop=state.novaShop){
  const rewards=shop?.rebirthRewards||[],reward=rewards.find(r=>Number(r.rebirth)===Number(rebirth));
  const regularNovaCrystals=Number(reward?.regularNovaCrystals)||0;
  const regularTotal=rewards.filter(r=>Number(r.rebirth)<=Number(rebirth)).reduce((sum,r)=>sum+(Number(r.regularNovaCrystals)||0),0);
  const superRebirthNova=Number(reward?.novaCrystals)||0;
  return {regularNovaCrystals,regularTotal,superRebirthNova,totalNovaCrystals:regularTotal+superRebirthNova};
}
function novaRebirthRouteOptions(target,shop=state.novaShop){
  return (shop?.rebirthRewards||[]).map(reward=>{
    const totals=novaRebirthTotals(reward.rebirth,shop);
    return {...reward,...totals,runs:target>0?Math.ceil(target/totals.totalNovaCrystals):0};
  });
}
function novaRebirthRewardsHtml(shop=state.novaShop){
  return `<details class="nova-rebirth-rewards" open><summary>Nova crystals from rebirths</summary><div><p>Regular Nova is awarded when you reach the listed rebirth. Super Rebirth is a separate payout at that completed rank. The in-game rebirth screen shows the next rank: its Rank 31 screen offers the payout for your current rank, 30.</p><p>Running totals include regular Nova earned during one full cycle, before spending. Total after Super Rebirth adds that rank's SRB payout; other Nova sources are excluded.</p><table class="nova-reward-table"><thead><tr><th>Rebirth transition</th><th>Regular Nova</th><th>Running total (regular)</th><th>Super Rebirth payout</th><th>Total after Super Rebirth</th><th>SRB credit mult</th><th>SRB XP mult</th></tr></thead><tbody>${(shop?.rebirthRewards||[]).map(reward=>{const totals=novaRebirthTotals(reward.rebirth,shop);return `<tr data-nova-rebirth="${reward.rebirth}"><td>${reward.rebirth-1} &rarr; ${reward.rebirth}</td><td>${novaCount(totals.regularNovaCrystals)}</td><td>${novaCount(totals.regularTotal)}</td><td>${novaCount(totals.superRebirthNova)}</td><td><strong>${novaCount(totals.totalNovaCrystals)}</strong></td><td>${reward.creditMultPercent!=null?`${novaCount(reward.creditMultPercent)}%`:'&mdash;'}</td><td>${reward.xpMultPercent!=null?`${novaCount(reward.xpMultPercent)}%`:'&mdash;'}</td></tr>`}).join('')}</tbody></table></div></details>`;
}
function rebirthRewardHtml(rebirth){
  const reward=rebirthReward(rebirth);if(!reward)return `<span class="rebirth-reward-mult">Rebirth +${Number(state.progression?.rebirthCreditBonuses?.[rebirth-1]||0).toFixed(2)}x credits</span>`;
  const cumulative=novaRebirthTotals(rebirth);
  const perks=[];
  if(reward.critChancePercent)perks.push(`+${reward.critChancePercent}% crit chance`);
  if(reward.critAmountPercent)perks.push(`+${reward.critAmountPercent}% crit amount`);
  return `<span class="rebirth-reward"><span class="rebirth-reward-mult">Rebirth +${Number(state.progression?.rebirthCreditBonuses?.[rebirth-1]||0).toFixed(2)}x credits</span>${reward.regularNovaCrystals?`<span class="rebirth-nova-reward regular">On rebirth ${novaAmount(reward.regularNovaCrystals)}</span>`:''}<span class="rebirth-nova-reward super">On Super Rebirth ${novaAmount(reward.novaCrystals)}</span>${reward.creditMultPercent!=null?`<span class="rebirth-reward-mult">SRB +${novaCount(reward.creditMultPercent)}% credits</span>`:''}<span class="rebirth-nova-reward cumulative" title="All regular Nova earned from the start of this cycle through this rank">Collected by this rank ${novaAmount(cumulative.regularTotal)}</span><span class="rebirth-nova-reward cumulative" title="Regular Nova total plus one Super Rebirth payout at this rank">Including Super Rebirth ${novaAmount(cumulative.totalNovaCrystals)}</span>${perks.map(text=>`<span class="rebirth-reward-perk">${text}</span>`).join('')}</span>`;
}
function baseRebirthSummaryHtml(){const summary=fullCycleRebirthSummary({respectGoal:true}),cycle=state.rebirths[state.cycle]||[],goal=rebirthGoal(),nextRebirth=cycle.find(r=>r.to===state.rebirth+1&&r.to<=goal),nextReady=summary.ready.find(n=>n>state.rebirth),rarityOrder=['COMMON','RARE','EPIC','LEGENDARY','MYTHIC'],groups=new Map();for(const item of summary.missing){const rarity=item.droid?.rarity,variant=item.variant;if(!rarity||!variant)continue;const current=groups.get(rarity);if(!current||variantRank(variant)<variantRank(current))groups.set(rarity,variant)}const watchChips=[...groups.entries()].sort((a,b)=>rarityOrder.indexOf(a[0])-rarityOrder.indexOf(b[0])).map(([rarity,variant])=>`<span class="outlook-chip combined">${rarityText(rarity)}<span class="chip-plus">+</span> ${variantText(variant)}${variant==='GALACTIC'?'':'<span class="chip-plus">+</span>'}</span>`).join(''),cycleText=goal<maxRebirth()?`through your R: ${goal} goal`:'for the rest of this cycle',outlookPlaced=placements().placed,nextCards=nextRebirth?(nextRebirth.requiredDroids||[]).map(req=>{const d=state.droids.find(x=>x.name===req.droidName),where=droidWhereabouts(req.droidName,outlookPlaced),have=bestOwnedVariant(req.droidName),ready=rebirthVariantReady(have,req.variant),needsUpgrade=have&&!ready,chips=needsUpgrade?chipsToVariant(d,have,req.variant):0,statusClass=ready?'ready':needsUpgrade?'upgrade':'missing',statusText=ready?'&#10003;':needsUpgrade?'':'!';return d?`<a class="outlook-next-card ${statusClass}" href="#/droid/${slug(d.name)}">${picture(d,req.variant)}<span><strong><span class="rarity-text ${rarityClass(d.rarity)}">${d.name}</span> <span class="outlook-dot">·</span> ${requirementVariantText(req.variant)}</strong>${needsUpgrade?`<em>${rebirthActionText(d,have,req.variant,chips)}</em>`:''}${where?`<em class="outlook-where">${where}</em>`:''}</span>${statusText?`<b>${statusText}</b>`:''}</a>`:''}).join(''):'';return `<section class="rebirth-summary-box"><div class="rebirth-summary-copy"><p class="eyebrow">Rebirth outlook</p><strong>${nextReady?`You have all droids needed for R: ${nextReady}`:summary.missing.length?`Next goal rebirth still needs droids`:`You have every listed droid ${cycleText}`}</strong>${nextRebirth?`<div class="outlook-next"><span class="outlook-label">Next rebirth</span><div class="outlook-next-head"><div class="outlook-next-cost"><b>R: ${nextRebirth.to}</b>${creditAmount(nextRebirth.creditsCost)}</div><div class="outlook-next-rewards">${rebirthRewardHtml(nextRebirth.to)}</div></div><div class="outlook-next-grid">${nextCards}</div></div>`:''}${summary.missing.length?`<div class="outlook-watch"><span class="outlook-label">Keep an eye out for</span><div class="outlook-chip-row">${watchChips||'<span class="outlook-chip muted">No extra droid checks</span>'}</div></div>`:`<span class="outlook-clean">Nothing else is missing ${cycleText}.</span>`}</div><a class="btn secondary" href="#/rebirth">View rebirths</a></section>`}
function attachOutlookVariantControls(){const locations=new Map(placements().placed.map(unit=>[`${unit.source}:${unit.unit}`,unit])),best=new Map();for(const unit of expandedOwned()){const d=state.droids.find(x=>x.name===unit.name);if(!d||isIconic(d))continue;const located=locations.get(`${unit.source}:${unit.unit}`),candidate={...unit,...(located||{})},current=best.get(unit.name),candidateRank=variantRank(unit.variant),currentRank=variantRank(current?.variant);if(!current||candidateRank>currentRank||candidateRank===currentRank&&located&&!current.station)best.set(unit.name,candidate)}for(const card of document.querySelectorAll('.outlook-next-card')){if(card.closest('.outlook-next-wrap'))continue;const d=state.droids.find(x=>`#/droid/${slug(x.name)}`===card.getAttribute('href')),unit=d&&best.get(d.name);if(!unit)continue;const wrap=document.createElement('div'),button=document.createElement('button');wrap.className='outlook-next-wrap';card.replaceWith(wrap);wrap.append(card);button.type='button';button.className='slot-variant outlook-variant';button.dataset.source=unit.source;button.dataset.name=d.name;button.dataset.variant=unit.variant;button.dataset.station=unit.station||'';button.dataset.slot=Number.isInteger(unit.slot)?unit.slot:'';button.title=`Change ${d.name} quality (currently ${unit.variant.toLowerCase()})`;button.setAttribute('aria-label',button.title);button.textContent='◆';wrap.append(button)}}
function requirementState(name){const req=futureRequirements().find(x=>x.droidName===name);if(!req)return null;return{...req,enough:hasRequirement(req)}}
function luckyEligible(d){return d&&!isIconic(d)&&luckyChance(d)>0}
function luckyOwnedUnits(){const p=placements(),placed=new Map(p.placed.map(x=>[`${x.source}:${x.unit}`,x]));return expandedOwned().map(unit=>{const d=state.droids.find(x=>x.name===unit.name);return{...unit,droid:d,placement:placed.get(`${unit.source}:${unit.unit}`)}}).filter(x=>luckyEligible(x.droid)&&variantRank(x.variant)<variantRank('BESKAR'))}
function luckyCreditGain(unit,target='BESKAR'){const d=unit.droid,baseNow=d.variants[unit.variant]?.income||0,baseTarget=d.variants[target]?.income||0,p=placements(),productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),iconicRate=[...new Set(productive.map(x=>x.name))].reduce((sum,name)=>sum+iconicIncome(state.droids.find(d=>d.name===name)),0),placement=unit.placement,station=placement&&PRODUCTIVE_STATIONS.includes(placement.station)?placement.station:d.type,output=(station===d.type?1.1:1)+iconicRate;return Math.max(0,(baseTarget-baseNow)*output*effectiveMultiplier())}
function luckyRecommendations(mode='rebirth'){const reqs=futureRequirements(),bestByName=new Map();for(const unit of luckyOwnedUnits()){const previous=bestByName.get(unit.name);if(!previous||variantRank(unit.variant)>variantRank(previous.variant))bestByName.set(unit.name,unit)}return[...bestByName.values()].map(unit=>{const d=unit.droid,chance=luckyChance(d),target=nextVariant(unit.variant);if(!target)return null;const needed=reqs.filter(r=>r.droidName===d.name&&variantRank(r.variant)>variantRank(unit.variant)),chips=chipsToVariant(d,unit.variant,target),expectedChips=chips*chance,gain=luckyCreditGain(unit,target),expectedGain=gain*chance;if(mode==='rebirth'){if(!needed.length)return null;const bestNeed=needed.reduce((best,r)=>variantRank(r.variant)>variantRank(best.variant)?r:best,needed[0]),nextAt=Math.min(...needed.map(r=>r.at)),urgency=1/Math.max(1,nextAt-state.rebirth),score=expectedChips*(1+urgency*4);return{mode,unit,droid:d,target,neededTarget:bestNeed.variant,score,chance,chips,expectedChips,gain,expectedGain,nextAt,rebirths:[...new Set(needed.map(r=>r.at))],reason:`Needed at rebirth ${nextAt} as ${variantText(bestNeed.variant)}. Lucky only upgrades one step, so a ${luckyChanceLabel(d)} success moves it from ${variantText(unit.variant)} to ${variantText(target)} and saves ${fmt(chips)} chips (${fmt(expectedChips)} expected chips per attempt).`}}const score=expectedGain;return{mode,unit,droid:d,target,neededTarget:null,score,chance,chips,expectedChips,gain,expectedGain,nextAt:null,rebirths:reqs.filter(r=>r.droidName===d.name).map(r=>r.at),reason:`A Lucky success upgrades one step from ${variantText(unit.variant)} to ${variantText(target)}, adding about ${fmt(gain)}/s or ${fmt(gain*3600)}/h. At ${luckyChanceLabel(d)}, that is ${fmt(expectedGain*3600)}/h expected value per attempt.`}}).filter(Boolean).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5)}
function luckyDroidPage(){let mode='rebirth',selected=0;const render=()=>{const list=luckyRecommendations(mode),pick=list[selected]||list[0];app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Lucky Droid Recommendation</div><section class="lucky-hero"><p class="eyebrow">Daily gamble helper</p><h1>Lucky Droid Recommendation</h1><p class="lead">Every 24 hours you can gamble one Lucky Droid quality step: Default → Gold → Diamond → Rainbow → Beskar. Success chance depends on rarity: ${rarityText('COMMON')} 32%, ${rarityText('RARE')} 16%, ${rarityText('EPIC')} 8%, ${rarityText('LEGENDARY')} 4%, ${rarityText('MYTHIC')} 2%.</p><div class="variant-tabs lucky-tabs"><button data-lucky-mode="rebirth" class="${mode==='rebirth'?'active':''}">Rebirth based</button><button data-lucky-mode="credit" class="${mode==='credit'?'active':''}">Credit based</button></div></section>${list.length?`<div class="lucky-layout"><div class="lucky-list">${list.map((item,i)=>`<button class="lucky-card ${i===selected?'active':''}" data-lucky-pick="${i}"><span class="lucky-rank">${i+1}</span><div class="lucky-thumb">${picture(item.droid,item.unit.variant)}</div><div class="lucky-card-copy"><strong>${item.droid.name}</strong><div class="lucky-card-meta"><small class="lucky-step">${variantText(item.unit.variant)} <span class="variant-arrow">→</span> ${variantText(item.target)}</small><em><span>${mode==='rebirth'?'Expected chips':'Expected gain'}</span><b>${mode==='rebirth'?fmt(item.expectedChips):`+${fmt(item.expectedGain*3600)}/h`}</b><i>${luckyChanceLabel(item.droid)} chance</i></em></div></div></button>`).join('')}</div><article class="lucky-detail"><div class="article-grid"><article><p class="eyebrow">${mode==='rebirth'?'Rebirth priority':'Credit priority'}</p><h2>${pick.droid.name}</h2><p class="lead">${pick.reason}</p><table><tbody><tr><th>Current</th><td>${variantText(pick.unit.variant)}</td></tr><tr><th>Lucky target</th><td>${variantText(pick.target)}</td></tr>${pick.neededTarget?`<tr><th>Later needed as</th><td>${variantText(pick.neededTarget)}</td></tr>`:''}<tr><th>Success chance</th><td>${luckyChanceLabel(pick.droid)} per daily attempt</td></tr><tr><th>Upgrade chips saved</th><td>${fmt(pick.chips)} on success · ${fmt(pick.expectedChips)} expected</td></tr><tr><th>Credit gain</th><td>+${fmt(pick.gain)}/s · +${fmt(pick.gain*3600)}/h on success · +${fmt(pick.expectedGain*3600)}/h expected</td></tr>${pick.rebirths.length?`<tr><th>Future rebirth use</th><td>R: ${[...new Set(pick.rebirths)].join(', ')}</td></tr>`:''}</tbody></table><h3>Why this is good</h3><p>${mode==='rebirth'?`This mode favours the best expected one-step upgrade for upcoming rebirth requirements, with earlier rebirths weighted higher.`:`This mode favours the largest expected production gain from the next quality step after applying the rarity success chance.`}</p></article><aside class="infobox"><div class="info-title">${pick.droid.name}</div><div class="info-image">${picture(pick.droid,pick.target)}</div><div class="info-rows"><div class="info-row"><b>Type</b><span>${pick.droid.type}</span></div><div class="info-row"><b>Rarity</b><span>${rarityText(pick.droid.rarity)}</span></div><div class="info-row"><b>Chance</b><span>${luckyChanceLabel(pick.droid)}</span></div><div class="info-row"><b>From</b><span>${variantText(pick.unit.variant)}</span></div><div class="info-row"><b>To</b><span>${variantText(pick.target)}</span></div></div></aside></div></article></div>`:`<div class="empty">No eligible Lucky Droid recommendations yet. Add owned Common, Rare, Epic, Legendary, or Mythic droids below Beskar quality to your Base.</div>`}`;document.querySelectorAll('[data-lucky-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.luckyMode;selected=0;render()});document.querySelectorAll('[data-lucky-pick]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.luckyPick);render()})};render()}
function luckyRecommendationPool(mode='rebirth'){
  const reqs=futureRequirements(),bestByName=new Map(),items=[];
  for(const unit of luckyOwnedUnits()){const previous=bestByName.get(unit.name);if(!previous||variantRank(unit.variant)>variantRank(previous.variant))bestByName.set(unit.name,unit)}
  for(const unit of bestByName.values()){
    const d=unit.droid,target=nextVariant(unit.variant);if(!target)continue;
    const chance=luckyChance(d),needed=reqs.filter(r=>r.droidName===d.name&&variantRank(r.variant)>variantRank(unit.variant)),chips=chipsToVariant(d,unit.variant,target),expectedChips=chips*chance,gain=luckyCreditGain(unit,target),expectedGain=gain*chance;
    if(mode==='rebirth'&&!needed.length)continue;
    const bestNeed=needed.length?needed.reduce((best,r)=>variantRank(r.variant)>variantRank(best.variant)?r:best,needed[0]):null,nextAt=needed.length?Math.min(...needed.map(r=>r.at)):null,urgency=nextAt?1/Math.max(1,nextAt-state.rebirth):0,score=mode==='rebirth'?expectedChips*(1+urgency*4):expectedGain;
    items.push({mode,unit,droid:d,target,neededTarget:bestNeed?.variant||null,score,chance,chips,expectedChips,gain,expectedGain,nextAt,rebirths:[...new Set(needed.map(r=>r.at))],practicality:mode==='rebirth'?'upgrade':'owned',reason:mode==='rebirth'?`You already own ${d.name} as ${variantText(unit.variant)}. It is needed at rebirth ${nextAt} as ${variantText(bestNeed.variant)}; a Lucky success advances it one quality step and saves ${fmt(chips)} chips.`:`You already own this droid. A Lucky success advances it from ${variantText(unit.variant)} to ${variantText(target)}, adding about ${fmt(gain)}/s.`});
  }
  for(const d of state.droids){
    if(bestByName.has(d.name)||!luckyEligible(d)||!d.variants?.DEFAULT||!d.variants?.GOLD)continue;
    const needed=reqs.filter(r=>r.droidName===d.name);if(mode==='rebirth'&&!needed.length)continue;
    const unit={name:d.name,variant:'DEFAULT',droid:d,placement:null},target='GOLD',chance=luckyChance(d),chips=chipsToVariant(d,'DEFAULT',target),expectedChips=chips*chance,gain=luckyCreditGain(unit,target),expectedGain=gain*chance,nextAt=needed.length?Math.min(...needed.map(r=>r.at)):null,urgency=nextAt?1/Math.max(1,nextAt-state.rebirth):0;
    items.push({mode,unit,droid:d,target,neededTarget:needed[0]?.variant||null,score:mode==='rebirth'?expectedChips*(1+urgency*4):expectedGain,chance,chips,expectedChips,gain,expectedGain,nextAt,rebirths:[...new Set(needed.map(r=>r.at))],practicality:'missing',reason:`You do not currently own ${d.name}. It cannot be selected for Lucky until you find one randomly through quests, missions, or the conveyor.`});
  }
  return items.filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
function luckyDroidPageV2(){
  let savedFilters=['owned','upgrade','missing'];
  try{const parsed=JSON.parse(localStorage.getItem('droid-archive-lucky-practicality')||'null');if(Array.isArray(parsed)&&parsed.length)savedFilters=parsed}catch{}
  let mode='rebirth',selected=0;
  let filters=new Set(savedFilters);
  const labels={owned:'Already owned',upgrade:'Needs upgrading',missing:'Missing'};
  const render=()=>{
    const list=luckyRecommendationPool(mode).filter(x=>filters.has(x.practicality)).slice(0,5);if(selected>=list.length)selected=0;const pick=list[selected]||list[0];
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Lucky Droid Recommendation</div><section class="lucky-hero"><p class="eyebrow">Daily gamble helper</p><h1>Lucky Droid Recommendation</h1><p class="lead">Every 24 hours you can gamble one owned Lucky Droid by one quality step. Droids are found randomly through quests, missions, and the conveyor; missing entries are scouting targets, not droids you can purchase directly.</p><div class="variant-tabs lucky-tabs"><button data-lucky-mode="rebirth" class="${mode==='rebirth'?'active':''}">Rebirth based</button><button data-lucky-mode="credit" class="${mode==='credit'?'active':''}">Credit based</button></div><div class="lucky-practicality" aria-label="Practicality filters">${Object.entries(labels).map(([key,label])=>`<label class="${filters.has(key)?'active':''}"><input type="checkbox" data-lucky-practicality="${key}" ${filters.has(key)?'checked':''}><span>${label}</span></label>`).join('')}</div></section>${list.length?`<div class="lucky-layout"><div class="lucky-list">${list.map((item,i)=>`<button class="lucky-card ${i===selected?'active':''} practicality-${item.practicality}" data-lucky-pick="${i}"><span class="lucky-rank">${i+1}</span><div class="lucky-thumb">${picture(item.droid,item.unit.variant)}</div><div class="lucky-card-copy"><strong>${item.droid.name}</strong><span class="lucky-practicality-badge">${labels[item.practicality]}</span><div class="lucky-card-meta"><small class="lucky-step">${variantText(item.unit.variant)} <span class="variant-arrow">→</span> ${variantText(item.target)}</small><em><span>${mode==='rebirth'?'Expected chips':'Expected gain'}</span><b>${mode==='rebirth'?fmt(item.expectedChips):`+${fmt(item.expectedGain*3600)}/h`}</b><i>${luckyChanceLabel(item.droid)} chance</i></em></div></div></button>`).join('')}</div><article class="lucky-detail"><div class="article-grid"><article><p class="eyebrow">${labels[pick.practicality]} · ${mode==='rebirth'?'Rebirth priority':'Credit priority'}</p><h2>${pick.droid.name}</h2><p class="lead">${pick.reason}</p><table><tbody><tr><th>Current</th><td>${pick.practicality==='missing'?'Not owned':variantText(pick.unit.variant)}</td></tr><tr><th>Lucky target</th><td>${pick.practicality==='missing'?'Find one first':variantText(pick.target)}</td></tr>${pick.neededTarget?`<tr><th>Later needed as</th><td>${variantText(pick.neededTarget)}</td></tr>`:''}<tr><th>Success chance</th><td>${luckyChanceLabel(pick.droid)} per daily attempt</td></tr><tr><th>Upgrade-chip value</th><td>${fmt(pick.chips)} on success · ${fmt(pick.expectedChips)} expected</td></tr><tr><th>Credit gain</th><td>+${fmt(pick.gain)}/s · +${fmt(pick.expectedGain*3600)}/h expected</td></tr>${pick.rebirths.length?`<tr><th>Future rebirth use</th><td>R: ${pick.rebirths.join(', ')}</td></tr>`:''}</tbody></table>${pick.practicality==='missing'?'<div class="notice lucky-random-note">Find this droid randomly before attempting a Lucky upgrade.</div>':''}</article><aside class="infobox"><div class="info-title">${pick.droid.name}</div><div class="info-image">${picture(pick.droid,pick.target)}</div><div class="info-rows"><div class="info-row"><b>Status</b><span>${labels[pick.practicality]}</span></div><div class="info-row"><b>Type</b><span>${pick.droid.type}</span></div><div class="info-row"><b>Rarity</b><span>${rarityText(pick.droid.rarity)}</span></div><div class="info-row"><b>Chance</b><span>${luckyChanceLabel(pick.droid)}</span></div></div></aside></div></article></div>`:'<div class="empty">No recommendations match these practicality filters.</div>'}`;
    document.querySelectorAll('[data-lucky-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.luckyMode;selected=0;render()});
    document.querySelectorAll('[data-lucky-pick]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.luckyPick);render()});
    document.querySelectorAll('[data-lucky-practicality]').forEach(input=>input.onchange=()=>{input.checked?filters.add(input.dataset.luckyPracticality):filters.delete(input.dataset.luckyPracticality);if(!filters.size){filters.add(input.dataset.luckyPracticality);input.checked=true}localStorage.setItem('droid-archive-lucky-practicality',JSON.stringify([...filters]));selected=0;render()});
  };
  render();
}
function removeOwnedUnit(index,confirmed=false){const row=state.owned[index];if(!row)return;const warning=traitLossText([row]);if(!confirmed&&warning&&!confirm(warning+'Remove this droid?'))return;row.qty>1?row.qty--:state.owned.splice(index,1);save()}
function changeOwnedUnitVariant(source,variant,station,slot){const row=state.owned[source];if(!row||row.variant===variant)return;const from=row.variant;if(row.qty>1){const changed={...row,variant,qty:1,preferred:station,preferredSlot:slot};row.qty--;if(row.preferred===station&&Number(row.preferredSlot)===slot){delete row.preferred;delete row.preferredSlot}state.owned.push(changed)}else{row.variant=variant;row.preferred=station;row.preferredSlot=slot}
  // Still-building droids stay out of the Droidex until they are finished.
  const added=station==='BUILD'&&!row.built&&!autoCompleteBuilds()?0:recordDroidexUpgrade(row.name,from,variant);
  save();if(added)toast(`${added} new Droidex ${added===1?'entry':'entries'} from upgrading ${row.name}`)}
function fusionTraitInputs(step,units=expandedOwned()){return (units||[]).filter(u=>(step.inputs||[]).includes(`${u.source}:${u.unit}`));}
function traitLossText(units){
  const lost=units.filter(u=>normaliseTrait(u.trait)&&!isIconic(state.droids.find(d=>d.name===u.name)));
  return lost.length?`Trait loss: ${lost.map(u=>`${u.name} (${traitLabel(u)})`).join(', ')}. These traits belong to these copies and will be lost. `:'';
}
function traitComparisonHtml(before,after){
  const missionTotal=units=>units.reduce((sum,u)=>sum+(missionEstimate(u,state.droids.find(d=>d.name===u.name),{...normaliseMissionSettings(state.missionSettings),placed:units,shipId:state.missionSettings?.ships?.[u.slot]??(u.name==='CB-23'?5:0)})?.missions||0),0);
  const rows=[['Credits / second',incomeForPlaced(before),incomeForPlaced(after)],['Missions / hour (selected ships)',missionTotal(before),missionTotal(after)],['Offline credits (selected time)',offlineEstimate(before,incomeForPlaced(before)-passiveTraitIncome(before),state.missionSettings).credits,offlineEstimate(after,incomeForPlaced(after)-passiveTraitIncome(after),state.missionSettings).credits],['Chip Finder multiplier',traitSum(before,13),traitSum(after,13)],['Trait health bonus',traitSum(before,2),traitSum(after,2)],['Trait crit chance (percentage points)',traitSum(before,4)*100,traitSum(after,4)*100],['Trait crit amount (percentage points)',traitSum(before,5)*100,traitSum(after,5)*100],['Trait crafting bonus (%)',traitSum(before,3)*100,traitSum(after,3)*100],['Trait scrap bonus (%)',traitSum(before,7)*100,traitSum(after,7)*100],['Trait chip bonus (%)',traitSum(before,6)*100,traitSum(after,6)*100]];
  return `<details class="trait-guide" open><summary>Before / after</summary><div class="trait-comparison"><table><thead><tr><th>Measure</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${rows.map(([name,a,b])=>`<tr><th>${name}</th><td>${fmt(a)}</td><td>${fmt(b)}</td><td>${b>a?'+':''}${fmt(b-a)}</td></tr>`).join('')}</tbody></table></div><p>Uses these placements and your saved settings. Trait bonus rows show additions only. Mission rewards and utility perks are separate from passive income; compare their active status below.</p><ul>${after.filter(u=>normaliseTrait(u.trait)).map(u=>{const old=before.find(x=>x.source===u.source&&x.unit===u.unit),t=u.trait;return `<li>${escapeAttr(u.name)}: ${escapeAttr(old?traitLabel(old):'Not owned')} (${old&&traitAmount(old,old.trait?.id)?'active':'inactive'}) &rarr; ${escapeAttr(traitLabel(u))} (${traitAmount(u,t.id)?'active':'inactive'})</li>`;}).join('')}</ul></details>`;
}
function showTraitModal(card,onDone){
  const d=state.droids.find(d=>d.name===card.name),root=document.querySelector('#modalRoot');if(!d)return;
  const current=normaliseTrait(card.trait||state.owned[card.source]?.trait,d),options=TRAITS.filter(t=>traitEligible(t,d));
  root.innerHTML=`<div class="modal-backdrop"><section class="modal trait-edit-modal" role="dialog" aria-modal="true" aria-labelledby="traitTitle"><p class="eyebrow">Record your in-game trait</p><h2 id="traitTitle">${escapeAttr(d.name)}</h2><p>Select the trait and tier you revealed in game. This records one droid, not every copy you own. Use the Trait Scanner result, not the standard perks printed on the droid card.</p><label>Trait<select class="form-control" id="ownedTrait"><option value="">No trait recorded</option>${options.map(t=>`<option value="${t.id}" ${current?.id===t.id?'selected':''}>${escapeAttr(traitOptionLabel(t))}</option>`).join('')}</select></label><label>Trait tier<select class="form-control" id="ownedTraitTier"></select></label><label>Previous rerolls<input class="form-control" id="ownedTraitRerolls" type="number" min="0" step="1" value="${current?.rerolls||0}"></label><p id="ownedTraitHelp"></p><div id="ownedTraitComparison" aria-live="polite"></div><p>${isIconic(d)?'This Iconic trait is retained across Super Rebirth and returning/reclaiming the droid.':'This trait is lost if you sell or consume the droid, or Super Rebirth.'} <a href="#/traits" id="traitGuideLink">Trait guide</a></p><div class="modal-actions"><button class="btn" id="saveOwnedTrait">Save trait</button><button class="btn secondary" id="cancelOwnedTrait">Cancel</button></div></section></div>`;
  const select=root.querySelector('#ownedTrait'),tier=root.querySelector('#ownedTraitTier');
  const update=()=>{const t=options.find(t=>String(t.id)===select.value);tier.innerHTML=t?Object.keys(t.values).map(v=>`<option ${current?.id===t.id&&current.tier===v?'selected':''}>${v}</option>`).join(''):'';tier.disabled=!t;root.querySelector('#ownedTraitHelp').textContent=t?.effect||'No trait bonus will be applied.';};
  const compare=()=>{const before=placements().placed,after=before.map(u=>u.source===card.source&&u.unit===(card.unit??0)?{...u,trait:select.value===''?null:{id:Number(select.value),tier:tier.value}}:u);root.querySelector('#ownedTraitComparison').innerHTML=traitComparisonHtml(before,after);};
  select.onchange=()=>{update();compare();};tier.onchange=compare;update();compare();
  root.querySelector('#cancelOwnedTrait').onclick=()=>root.innerHTML='';root.querySelector('#traitGuideLink').onclick=()=>root.innerHTML='';
  root.querySelector('#saveOwnedTrait').onclick=()=>{
    const indices=materializePlacements(placements()),index=indices.get(`${card.source}:${card.unit??0}`),row=state.owned[index];if(!row)return;
    const value=select.value===''?null:normaliseTrait({id:Number(select.value),tier:tier.value,rerolls:root.querySelector('#ownedTraitRerolls').value},d);
    if(value)row.trait=value;else delete row.trait;
    if(isIconic(d)){state.iconicTraits??={};if(value)state.iconicTraits[d.name]=value;else delete state.iconicTraits[d.name];}
    save();root.innerHTML='';onDone();
  };
}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-edit-trait]');if(!button)return;if(state.sharedView&&!state.sharedView.canEdit)return;const card=expandedOwned().find(u=>u.source===Number(button.dataset.editTrait)&&u.unit===Number(button.dataset.traitUnit));if(card)showTraitModal(card,()=>route());},true);
function showCardVariantModal(card,onDone){const root=document.querySelector('#modalRoot'),d=state.droids.find(x=>x.name===card.name);if(!d||isIconic(d))return;root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><p class="eyebrow">Change quality</p><h2>${d.name}</h2><p class="picker-hint">Choose the quality and activation colour you own. Kyber without a colour means dormant. This updates this exact card without removing it from its slot.</p><div class="variant-choice">${DISPLAY_VARIANTS.map(v=>`<button data-card-variant="${v}" ${v===card.variant?'disabled':''}>${picture(d,v)}<strong>${variantText(v)}</strong><small>${v===card.variant?'Current quality':variantIncomeText(d,v)}</small></button>`).join('')}</div><button class="btn ghost" id="cancelVariantChange">Cancel</button></section></div>`;root.querySelectorAll('[data-card-variant]').forEach(button=>button.onclick=()=>{changeOwnedUnitVariant(card.source,button.dataset.cardVariant,card.station,card.slot);root.innerHTML='';onDone()});root.querySelector('#cancelVariantChange').onclick=()=>root.innerHTML=''}
// Map commands mirror the game command from this droid's current attachment point.
function mapDroidAction(card,action,onDone){
  if(state.sharedView&&!state.sharedView.canEdit)return;
  const p=placements(),unit=p.placed.find(u=>u.source===card.source&&u.unit===card.unit&&u.name===card.name&&u.variant===card.variant);
  if(!unit||isBuilding(unit))return toast('Complete this build before using these actions.');
  const d=state.droids.find(d=>d.name===unit.name),rules=optimiseRouteRules();
  if(action==='sell'||action==='return'){
    if((action==='return')!==isIconic(d))return;
    if(action==='sell'&&!confirm(`Sell ${variantLabel(unit.variant)} ${unit.name}? ${traitLossText([unit])}`))return;
    if(action==='return'&&!confirm(`Return ${unit.name}? Its recorded Iconic trait will be kept for reclaiming it.`))return;
    state.iconicTraits=rememberIconicTraits(state.iconicTraits,state.owned,state.droids);
    const indices=materializePlacements(p);state.owned.splice(indices.get(`${unit.source}:${unit.unit}`),1);save();onDone();return;
  }
  const station={companion:'COMPANION',lounge:'LOUNGE',fusion:'FUSION'}[action];
  if(station===unit.station)return toast(`This droid is already in ${placeName(station)}.`);
  const target=action==='work'?predictWorkLanding(unit,p.placed,rules):station?predictStationLanding(unit,p.placed,station,rules):null;
  if(!target){
    if(action==='companion'){
      const choices=p.placed.filter(u=>u.station==='COMPANION'&&!isBuilding(u)&&rules.canUse(u,unit.station));
      if(choices.length){
        const root=document.querySelector('#modalRoot');
        root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><h2>Choose a Companion to swap</h2><p>The selected Companion takes this droid's current slot.</p>${choices.map(u=>`<button class="btn secondary" data-command-companion="${u.source}:${u.unit}">${escapeAttr(u.name)} ? Slot ${u.slot+1}</button>`).join('')}<button class="btn ghost" id="cancelMapCommand">Cancel</button></section></div>`;
        root.querySelector('#cancelMapCommand').onclick=()=>root.innerHTML='';
        root.querySelectorAll('[data-command-companion]').forEach(b=>b.onclick=()=>{root.innerHTML='';moveUnitByKey(`${unit.source}:${unit.unit}`,b.dataset.commandCompanion,onDone);});return;
      }
    }
    return toast('No available destination for this command.');
  }
  if(target.assumed&&!confirm(`Predicted destination: ${placeName(target.station)} ${target.slot+1}. The exact landing is uncertain; check it in game and correct the map if needed. Record this move?`))return;
  moveUnitToSlot(`${unit.source}:${unit.unit}`,target.station,target.slot,onDone);
  toast(`${unit.name}: ${placeName(target.station)} ${target.slot+1}`);
}
function showSwapModal(card,onDone){const root=document.querySelector('#modalRoot'),p=placements(),source=p.placed.find(x=>x.source===card.source&&x.unit===card.unit),occupiedKey=(station,slot)=>`${station}:${slot}`,occupied=new Set(p.placed.map(x=>occupiedKey(x.station,x.slot))),items=p.placed.filter(x=>!(x.source===card.source&&x.unit===card.unit)).map(x=>({...x,targetType:'occupied'})),emptySlots=Object.keys(SLOT_RULES).filter(station=>station!=='BUILD').flatMap(station=>stationSlotIndices(station).filter(slot=>!occupied.has(occupiedKey(station,slot))).map(slot=>({targetType:'empty',station,slot,name:`Empty ${station} ${slot+1}`,variant:'DEFAULT'})));if(!source)return;root.innerHTML=`<div class="modal-backdrop"><section class="modal slot-picker" role="dialog" aria-modal="true"><p class="eyebrow">Manual swap</p><h2>Move ${source.name}</h2><p class="picker-hint">Choose another droid to swap with, or an empty unlocked non-Build slot to move into. Build slots must be swapped with an existing Build droid.</p><input id="swapSearch" class="form-control picker-search" placeholder="Search droids or slots…" autofocus><div id="swapResults" class="picker-results"></div><button class="btn ghost" id="cancelSwap">Cancel</button></section></div>`;const draw=()=>{const q=root.querySelector('#swapSearch').value.toLowerCase(),targets=[...items,...emptySlots].filter(x=>canUseStation(state.droids.find(d=>d.name===source.name),x.station)&&(x.targetType==='empty'||canUseStation(state.droids.find(d=>d.name===x.name),source.station))).filter(x=>x.name.toLowerCase().includes(q)||x.station.toLowerCase().includes(q)||String(x.slot+1).includes(q));root.querySelector('#swapResults').innerHTML=targets.map(x=>{if(x.targetType==='empty')return `<button class="picker-droid empty-slot-choice" data-empty-station="${x.station}" data-empty-slot="${x.slot}"><span class="slot-icon">${stationIcon(x.station)}</span><b>${x.name}</b><small>Move into empty slot</small></button>`;const d=state.droids.find(y=>y.name===x.name);return `<button class="picker-droid" data-swap-key="${x.source}:${x.unit}"><span>${picture(d,x.variant)}</span><b>${x.name}</b><small>${variantText(x.variant)} · ${x.station} ${x.slot+1}</small></button>`}).join('')||'<p class="roster-empty">No matching droids or empty slots.</p>';root.querySelectorAll('[data-swap-key]').forEach(b=>b.onclick=()=>{moveUnitByKey(`${source.source}:${source.unit}`,b.dataset.swapKey,onDone);root.innerHTML=''});root.querySelectorAll('[data-empty-station]').forEach(b=>b.onclick=()=>{moveUnitToSlot(`${source.source}:${source.unit}`,b.dataset.emptyStation,Number(b.dataset.emptySlot),onDone);root.innerHTML=''})};root.querySelector('#swapSearch').oninput=draw;root.querySelector('#cancelSwap').onclick=()=>root.innerHTML='';draw()}
function showSuperRebirthConfirm(rerender,really=false){const root=document.querySelector('#modalRoot'),question=really?'Are you really sure you want to super rebirth?':'Are you sure you want to super rebirth?';root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="superRebirthTitle"><p class="eyebrow">Destructive action</p><h2 id="superRebirthTitle">${question}</h2><p>This will remove every droid from your base and reset its progression. Your regular Rebirth bonus of +${regularRebirthMultiplier().toFixed(2)}x will be removed and the Super Rebirth reward of +${(Number(rebirthReward(state.rebirth)?.creditMultPercent||0)/100).toFixed(2)}x added. Your resulting multiplier will be ${superRebirthMultiplier().toFixed(2)}x (minimum 1x if your entered total is below the bonuses being removed). This cannot be undone unless you exported your base first.</p><p>${escapeAttr(traitLossText(expandedOwned()))}Iconic traits, tiers and reroll counts are retained and restored when received again.</p><div class="modal-actions"><button class="btn danger" id="confirmSuperRebirth">Yes, super rebirth</button><button class="btn ghost" id="cancelSuperRebirth">Cancel</button></div></section></div>`;root.querySelector('#cancelSuperRebirth').onclick=()=>root.innerHTML='';root.querySelector('#confirmSuperRebirth').onclick=()=>{if(!really){showSuperRebirthConfirm(rerender,true);return}if(!rebirthReward(state.rebirth)){toast('Super Rebirth is available from Rebirth 12');return;}state.iconicTraits=rememberIconicTraits(state.iconicTraits,state.owned,state.droids);state.owned=[];state.multiplier=superRebirthMultiplier();state.rebirth=0;state.purchasedSlots=[];state.loungePurchased=0;state.novaLevel=0;const cycleCount=Object.keys(state.rebirths).length;state.cycle=cycleCount?(state.cycle+1)%cycleCount:0;save();root.innerHTML='';toast(`Super rebirth complete · Cycle ${state.cycle+1}`);rerender()}}
function cloudDocFromCurrent(name='Main'){const id=cloudId();return{app:'Droid Archives',version:1,updatedAt:new Date().toISOString(),activeProfileId:id,ui:{theme:state.theme},profiles:[{id,name,updatedAt:new Date().toISOString(),data:profileDataFromState()}]}}
function normalizeCloudDoc(doc){doc=normalizeProfileDoc(doc);doc.ui=doc.ui||{};return doc}
function cloudDocFromLocalProfiles(){updateActiveLocalProfile();const local=ensureLocalDoc();return normalizeCloudDoc({...local,ui:{theme:state.theme}})}
const supabaseReady=()=>Boolean(supabaseConfig.url&&supabaseConfig.anonKey&&window.supabase);
const supabaseTable=()=>supabaseConfig.table||'droid_archive_profiles';
const authRedirectUrl=()=>{const here=location.origin+location.pathname.replace(/[^/]*$/,'');return AUTH_SITES.includes(here)?here:PUBLIC_SITE_URL};
function rowToCloudDoc(row){if(!Array.isArray(row?.profiles)||!row.profiles.length)throw Error('Cloud profile data is empty. Sync has been stopped to protect your profiles.');const doc=normalizeCloudDoc({app:'Droid Archives',version:1,updatedAt:row.updated_at,activeProfileId:row.active_profile_id,ui:row.ui||{},profiles:row.profiles});doc._revision=Math.max(1,Number(row.revision)||1);return doc}
function cloudDocToRow(revision=state.cloud.doc?._revision){return{user_id:state.cloud.user.id,email:state.cloud.user.email||'',profiles:state.cloud.doc.profiles,active_profile_id:state.cloud.doc.activeProfileId,ui:{theme:state.theme},revision,updated_at:new Date().toISOString()}}
async function loadSupabaseConfig(){try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);const response=await fetch(`${SUPABASE_CONFIG_PATH}?${Date.now()}`,{signal:controller.signal});clearTimeout(timer);if(response.ok){const config=await response.json();supabaseConfig={...supabaseConfig,url:config.url||'',anonKey:config.anonKey||config.anon_key||'',table:config.table||supabaseConfig.table}}}catch{}}
async function initSupabase(){if(!supabaseReady()){state.cloud.enabled=false;state.cloud.reconnecting=false;state.cloud.status='Local save';saveLocal();return}supabaseClient=window.supabase.createClient(supabaseConfig.url,supabaseConfig.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});supabaseClient.auth.onAuthStateChange((event,session)=>{state.cloud.session=session;state.cloud.user=session?.user||null;setTimeout(()=>verifyKyberPreview(),0);if(event==='PASSWORD_RECOVERY')showPasswordUpdateModal();if(!session){state.cloud.doc=null;state.cloud.reconnecting=false;state.cloud.status='SIGNED OUT — changes save locally only';renderCloudHeader();renderBaseSidebar(()=>route());return}if(!['INITIAL_SESSION','SIGNED_IN','PASSWORD_RECOVERY'].includes(event))return;loadSupabaseProfiles(true,{initializeIfMissing:state.cloud.initializingNewAccount}).then(()=>{state.cloud.initializingNewAccount=false}).catch(e=>{state.cloud.status=e.message;renderCloudHeader()})});if(state.cloud.enabled){state.cloud.reconnecting=true;state.cloud.status='Restoring Supabase session…';renderCloudHeader();const {data}=await supabaseClient.auth.getSession();state.cloud.session=data.session;state.cloud.user=data.session?.user||null;await verifyKyberPreview();if(state.cloud.user)await loadSupabaseProfiles(true);else{state.cloud.reconnecting=false;state.cloud.status='SIGNED OUT — sign in to sync';saveLocal()}}}
async function initSupabaseSafe(){try{await Promise.race([initSupabase(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Cloud save restore timed out')),5000))])}catch(e){state.cloud.reconnecting=false;state.cloud.status='Cloud save delayed — local mode';saveLocal();renderCloudHeader()}}
async function refreshProfileCatalogue(data){
  const fresh=await ensureProfileCatalogue(data,{droids:state.droids,canonicalName:canonicalDroidName,refresh:async()=>{
    const response=await fetch(`data/droids.json?v=${DATA_VERSION}&refresh=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw Error('Catalogue unavailable');
    return response.json();
  }});
  if(fresh!==state.droids){state.droids=applyStellarData(structuredClone(fresh),releaseData?.stellarStats||{});if(releaseData)releaseData.current.droids=structuredClone(fresh);}
}
async function loadSupabaseProfiles(apply=true,{initializeIfMissing=false}={}){if(!supabaseClient||!state.cloud.user)return;if(state.cloud.loadPromise)return state.cloud.loadPromise;state.cloud.loadPromise=(async()=>{state.cloud.profileRestoreBlocked=true;clearTimeout(cloudSaveTimer);state.cloud.reconnecting=false;state.cloud.status='Loading cloud profiles…';renderCloudHeader();const {data,error}=await supabaseClient.from(supabaseTable()).select('user_id,email,profiles,active_profile_id,ui,revision,updated_at').eq('user_id',state.cloud.user.id).maybeSingle();if(error)throw Error(error.message);if(!data){if(!initializeIfMissing)throw Error('No cloud save was found. Nothing was uploaded; contact support before creating a replacement.');state.cloud.doc=cloudDocFromLocalProfiles();state.cloud.doc._revision=1;state.cloud.activeProfileId=state.cloud.doc.activeProfileId;const {error:insertError}=await supabaseClient.from(supabaseTable()).insert(cloudDocToRow(1));if(insertError)throw Error(insertError.message)}else state.cloud.doc=rowToCloudDoc(data);state.cloud.activeProfileId=state.cloud.doc.activeProfileId;state.cloud.loadedProfileCount=state.cloud.doc.profiles.length;state.cloud.allowProfileCountDecrease=false;if(apply&&!state.sharedView){const profile=activeCloudProfile();if(!profile)throw Error('The active cloud profile is missing. Sync has been stopped.');await refreshProfileCatalogue(profile.data);applyProfileData(profile.data)}if(state.cloud.doc.ui?.theme){state.theme=state.cloud.doc.ui.theme;applyTheme()}state.cloud.enabled=true;state.cloud.reconnecting=false;state.cloud.profileRestoreBlocked=false;state.cloud.status='Synced';cacheCloudDocLocally();saveLocal();subscribeCloudChanges();await loadGroupWorkspace().catch(()=>{});route();renderCloudHeader()})();try{return await state.cloud.loadPromise}finally{state.cloud.loadPromise=null}}
// ---- Live sync between every tab signed in to the account ------------------
//
// The site in a browser and the site inside the companion are two separate
// Chromium profiles with their own localStorage, so the only thing they share
// is the account's row in Supabase. Each writes there already; what was missing
// was either of them learning that the other had.
//
// The row carries a revision that every write increments, which makes this
// simple: a notification whose revision is no higher than the one already held
// is this tab's own write coming back, and anything higher is somebody else's.
function unsubscribeCloudChanges(){
  if(!state.cloud.channel)return;
  try{supabaseClient?.removeChannel(state.cloud.channel)}catch{}
  state.cloud.channel=null;
}
function subscribeCloudChanges(){
  if(!supabaseClient||!state.cloud.user||state.cloud.channel)return;
  const userId=state.cloud.user.id;
  state.cloud.channel=supabaseClient
    .channel(`droid-archive-profiles:${userId}`)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:supabaseTable(),filter:`user_id=eq.${userId}`},
        payload=>{cloudDocChangedElsewhere(Number(payload?.new?.revision)||0)})
    .subscribe();
}
async function cloudDocChangedElsewhere(revision){
  if(!cloudConnected())return;
  if(revision<=(Number(state.cloud.doc._revision)||0))return;   // our own write echoing back
  // Never pull over the top of an edit that has not been written yet: the
  // debounced save is still holding it, and reloading would discard it.
  if(state.cloud.syncing||cloudSaveTimer)return;
  try{
    await loadSupabaseProfiles(true);
    route();
    toast('Updated from another device');
  }catch(e){state.cloud.status=e.message;renderCloudHeader()}
}
async function writeSupabaseDoc(){if(state.cloud.profileRestoreBlocked)throw Error('Cloud save blocked until your profile has loaded successfully.');if(!supabaseClient||!state.cloud.user||!state.cloud.doc)throw Error('Supabase is not connected');const profiles=state.cloud.doc.profiles;if(!Array.isArray(profiles)||!profiles.length)throw Error('Cloud save blocked: a profile document cannot be empty.');if(state.cloud.loadedProfileCount&&profiles.length<state.cloud.loadedProfileCount&&!state.cloud.allowProfileCountDecrease)throw Error('Cloud save blocked because profiles disappeared unexpectedly. Reload before syncing.');const expectedRevision=Math.max(1,Number(state.cloud.doc._revision)||1),nextRevision=expectedRevision+1;state.cloud.doc.updatedAt=new Date().toISOString();state.cloud.doc.activeProfileId=state.cloud.activeProfileId;state.cloud.doc.ui={theme:state.theme};const {data,error}=await supabaseClient.from(supabaseTable()).update(cloudDocToRow(nextRevision)).eq('user_id',state.cloud.user.id).eq('revision',expectedRevision).select('revision,updated_at').maybeSingle();if(error)throw Error(error.message);if(!data)throw Error('Cloud save conflict: this account changed in another tab or device. Your data was not overwritten; reload before syncing.');state.cloud.doc._revision=Number(data.revision)||nextRevision;state.cloud.loadedProfileCount=profiles.length;state.cloud.allowProfileCountDecrease=false;cacheCloudDocLocally();saveLocal()}
async function cloudSaveNow(){if(state.sharedView)return state.sharedView.canEdit?saveSharedProfileNow():undefined;if(!cloudConnected())return;state.cloud.syncing=true;state.cloud.status='Syncing…';renderBaseSidebar(()=>route());renderCloudHeader();try{updateActiveCloudProfile();await writeSupabaseDoc();state.cloud.status='Synced';toast(`${activeProfile()?.name||'Profile'} changes synced`)}catch(e){state.cloud.status=e.message;throw e}finally{state.cloud.syncing=false;renderBaseSidebar(()=>route());renderCloudHeader()}}
const GROUP_OUTLOOK_KEY='droid-archive-group-outlook-profiles';
const groupProfileKey=(_groupId,ownerId,profileId)=>`${ownerId}:${profileId}`;
const defaultGroupDisplayName=()=>String(state.cloud.user?.email||'Player').split('@')[0].slice(0,40)||'Player';
const groupOutlookStorageKey=()=>`${GROUP_OUTLOOK_KEY}:${state.cloud.user?.id||'local'}`;
function groupOutlookSelection(){try{const raw=localStorage.getItem(groupOutlookStorageKey());return raw===null?null:new Set(JSON.parse(raw))}catch{return null}}
function setGroupOutlookProfile(groupId,ownerId,profileId,selected){const available=state.groups.workspace.flatMap(group=>groupAvailableProfiles(group).map(profile=>groupProfileKey(group.id,profile.ownerId,profile.profileId))),selection=groupOutlookSelection()||new Set(available),key=groupProfileKey(groupId,ownerId,profileId);selected?selection.add(key):selection.delete(key);localStorage.setItem(groupOutlookStorageKey(),JSON.stringify([...selection]))}
function groupAvailableProfiles(group){const ownId=state.cloud.user?.id||'',shared=Array.isArray(group?.profiles)?group.profiles:[],own=(state.cloud.doc?.profiles||[]).map(profile=>{const share=shared.find(item=>item.ownerId===ownId&&item.profileId===profile.id);return{ownerId:ownId,ownerName:'You',profileId:profile.id,profileName:profile.name,updatedAt:profile.updatedAt,canEdit:true,isOwn:true,shared:Boolean(share),shareCanEdit:Boolean(share?.canEdit),data:profile.data}}),others=shared.filter(profile=>profile.ownerId!==ownId).map(profile=>({...profile,isOwn:false,shared:true,shareCanEdit:Boolean(profile.canEdit)}));return[...own,...others]}
function availableGroupOutlookProfiles(){const profiles=new Map();for(const group of state.groups.workspace)for(const profile of groupAvailableProfiles(group)){const key=groupProfileKey(group.id,profile.ownerId,profile.profileId),existing=profiles.get(key);if(existing){existing.groupNames.push(group.name);continue}profiles.set(key,{...profile,key,groupId:group.id,groupNames:[group.name]})}return[...profiles.values()]}
function selectedGroupProfiles(){const selection=groupOutlookSelection(),seen=new Set(),profiles=[];for(const group of state.groups.workspace)for(const profile of groupAvailableProfiles(group)){const key=groupProfileKey(group.id,profile.ownerId,profile.profileId),identity=`${profile.ownerId}:${profile.profileId}`;if((selection===null||selection.has(key))&&!seen.has(identity)){seen.add(identity);profiles.push({...profile,groupId:group.id,groupName:group.name})}}return profiles}
async function loadGroupWorkspace({rerender=false,force=false}={}){if(!cloudConnected()){state.groups={workspace:[],loading:false,loaded:false,error:'',loadPromise:null};return[]}if(state.groups.loading){const current=await(state.groups.loadPromise||Promise.resolve(state.groups.workspace));if(!force)return current}state.groups.loading=true;state.groups.error='';if(rerender&&location.hash.startsWith('#/groups'))groupsPage();state.groups.loadPromise=(async()=>{const {data,error}=await supabaseClient.rpc('droid_archive_group_workspace');if(error)throw Error(error.message);state.groups.workspace=Array.isArray(data)?data:[];state.groups.loaded=true;return state.groups.workspace})();try{return await state.groups.loadPromise}catch(error){state.groups.workspace=[];state.groups.loaded=true;state.groups.error=error.message.includes('Could not find the function')?'The group database update has not been installed yet. Run the latest data/supabase-schema.sql in Supabase.':error.message;throw error}finally{state.groups.loading=false;state.groups.loadPromise=null;if(rerender&&location.hash.startsWith('#/groups'))groupsPage()}}
async function createArchiveGroup(name,displayName){const {error}=await supabaseClient.rpc('create_droid_archive_group',{group_name:name,member_display_name:displayName});if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
async function joinArchiveGroup(code,displayName){const {error}=await supabaseClient.rpc('join_droid_archive_group',{supplied_invite_code:code,member_display_name:displayName});if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
async function setArchiveProfileShare(groupId,profileId,shared,canEdit){clearTimeout(cloudSaveTimer);await cloudSaveNow();const {error}=await supabaseClient.rpc('set_droid_archive_profile_share',{target_group_id:groupId,target_profile_id:profileId,should_share:shared,allow_edit:canEdit});if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
async function leaveArchiveGroup(groupId){const {error}=await supabaseClient.rpc('leave_droid_archive_group',{target_group_id:groupId});if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
async function removeArchiveGroupMember(groupId,userId){const {error}=await supabaseClient.rpc('remove_droid_archive_group_member',{target_group_id:groupId,target_user_id:userId});if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
async function reviewArchiveGroupMember(groupId,userId,approved){const {error}=await supabaseClient.rpc('review_droid_archive_group_member',{target_group_id:groupId,target_user_id:userId,approve_member:approved});if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
async function deleteArchiveGroup(groupId){const {error}=await supabaseClient.from('droid_archive_groups').delete().eq('id',groupId);if(error)throw Error(error.message);await loadGroupWorkspace({force:true})}
function profileBestOwnedVariant(data,name){let best=null;for(const row of (data?.owned||[]).filter(item=>item.name===name&&!rowIsBuilding(item)))if(!best||(variantRank(row.variant)>variantRank(best)||isActiveKyber(row.variant)&&!isActiveKyber(best)))best=row.variant;return best}
function profileRequirementReady(data,cycleIndex,rebirth,req){const tracker=normalizeRebirthTracker(data?.rebirthTracker);if(tracker.notUsingBase){const entry=tracker.entries[`${cycleIndex}:${rebirth}:${req.droidName}:${req.variant}`]||{},selected=OWNED_VARIANTS.includes(entry.variant)?entry.variant:null;return Boolean(rebirthVariantReady(selected,req.variant,entry.kyberActive)||(entry.complete&&(baseVariant(req.variant)!=='KYBER'||entry.kyberActive)))}const have=profileBestOwnedVariant(data,req.droidName);return rebirthVariantReady(have,req.variant)}
function groupProfileOutlookModel(profile){const data=profile.data||{},cycleIndex=Number(data.cycle)||0,cycle=state.rebirths[cycleIndex]||[],current=Math.max(0,Number(data.rebirth)||0),goal=Math.max(12,Math.min(cycle.at(-1)?.to||30,Number(data.superRebirthGoal)||cycle.at(-1)?.to||30)),future=cycle.filter(rebirth=>rebirth.to>current&&rebirth.to<=goal),ready=future.filter(rebirth=>(rebirth.requiredDroids||[]).length&&(rebirth.requiredDroids||[]).every(req=>profileRequirementReady(data,cycleIndex,rebirth.to,req))).map(rebirth=>rebirth.to),missing=future.flatMap(rebirth=>(rebirth.requiredDroids||[]).filter(req=>!profileRequirementReady(data,cycleIndex,rebirth.to,req)).map(req=>({...req,at:rebirth.to}))),next=future[0]||null;return{cycleIndex,current,goal,ready,missing,next}}
function profileRequirementAction(data,cycle,rebirth,req){if(profileRequirementReady(data,cycle,rebirth,req))return '';const tracker=normalizeRebirthTracker(data?.rebirthTracker),have=tracker.notUsingBase?tracker.entries[`${cycle}:${rebirth}:${req.droidName}:${req.variant}`]?.variant:profileBestOwnedVariant(data,req.droidName),d=state.droids.find(x=>x.name===req.droidName);return have&&d?rebirthActionText(d,have,req.variant,chipsToVariant(d,have,req.variant)):''}
function groupOutlookCardsHtml(){const profiles=selectedGroupProfiles();if(!profiles.length)return'<div class="empty">Choose at least one profile to build a combined outlook.</div>';return`<div class="group-outlook-grid">${profiles.map(profile=>{const model=groupProfileOutlookModel(profile),requirements=model.next?.requiredDroids||[],readyCount=requirements.filter(req=>profileRequirementReady(profile.data,model.cycleIndex,model.next.to,req)).length;return`<article class="group-outlook-card"><header><span><small>${escapeAttr(profile.ownerName)} · ${escapeAttr(profile.groupName)}</small><strong>${escapeAttr(profile.profileName)}</strong></span><button class="btn secondary" data-group-view="${profile.groupId}|${profile.ownerId}|${escapeAttr(profile.profileId)}">View</button></header><div class="group-outlook-stats"><span>Cycle <b>${model.cycleIndex+1}</b></span><span>Current <b>R ${model.current}</b></span><span>Goal <b>R ${model.goal}</b></span></div>${model.next?`<div class="group-outlook-next"><strong>Next: R ${model.next.to}</strong><span>${readyCount}/${requirements.length} droids ready</span><div>${requirements.map(req=>`<em class="${profileRequirementReady(profile.data,model.cycleIndex,model.next.to,req)?'ready':'missing'}">${escapeAttr(req.droidName)} · ${requirementVariantText(req.variant)}${profileRequirementAction(profile.data,model.cycleIndex,model.next.to,req)?`<small> ${profileRequirementAction(profile.data,model.cycleIndex,model.next.to,req)}</small>`:''}</em>`).join('')}</div></div>`:'<p class="outlook-clean">No rebirths remain within this profile’s goal.</p>'}<footer>${model.ready.length?`Ready now: R ${model.ready.join(', R ')}`:'No future rebirth is fully ready'} · ${model.missing.length} missing requirement${model.missing.length===1?'':'s'}</footer></article>`}).join('')}</div>`}
// ---- Rebirth need-hints: which profiles to check ---------------------------
// null means every profile, which is the useful default: a new profile starts
// being checked without anyone having to opt it in.
// Your own profiles plus any shared with you through a group. groupAvailableProfiles
// lists your own back to you as well, so those are skipped here rather than
// counted twice under two different keys.
function rebirthNeedProfiles(){
  const out=[],seen=new Set();
  const add=(key,name,data,owner)=>{if(!data||seen.has(key))return;seen.add(key);out.push({key,name,data,owner})};
  for(const profile of activeProfileDoc()?.profiles||[])add(`own:${profile.id}`,profile.name||'Profile',profile.data,'');
  for(const profile of availableGroupOutlookProfiles())if(!profile.isOwn)add(`grp:${profile.ownerId}:${profile.profileId}`,profile.profileName||'Profile',profile.data,profile.ownerName||'');
  return out;
}
// The companion passes its own selection in. It cannot use the one this page
// keeps: a browser and the companion's embedded view are separate Chromium
// profiles, so a choice made in one was never visible to the other — which
// meant the picker on Base never actually applied to the companion at all.
// An absent or empty list means every profile.
function chosenNeedProfiles(keys){
  if(!Array.isArray(keys)||!keys.length)return rebirthNeedProfiles();
  const wanted=new Set(keys);
  return rebirthNeedProfiles().filter(profile=>wanted.has(profile.key));
}
// Stand state in for another profile's save just long enough to ask a question
// of it. Everything the requirement test reads is swapped and put back, so the
// loaded profile is untouched even if the body throws.
function withProfileData(data,fn){
  const saved={owned:state.owned,cycle:state.cycle,rebirth:state.rebirth,droidex:state.droidex,superRebirthGoal:state.superRebirthGoal};
  try{
    state.owned=normalizeDroidRows(data?.owned||[]);
    state.droidex=normalizeDroidRows(data?.droidex||[]);
    state.cycle=Number(data?.cycle)||0;
    state.rebirth=Number(data?.rebirth)||0;
    // Each profile stops recommending at its own goal, so the goal is part of
    // the save being read, not of whichever profile is open in the tab.
    state.superRebirthGoal=data?.superRebirthGoal;
    return fn();
  }finally{state.owned=saved.owned;state.cycle=saved.cycle;state.rebirth=saved.rebirth;state.droidex=saved.droidex;state.superRebirthGoal=saved.superRebirthGoal}
}
// The companion holds the selection now; this only has to say what exists.
window.__companionRebirthNeedProfiles=()=>rebirthNeedProfiles().map(profile=>({key:profile.key,name:profile.name,owner:profile.owner}));

function showBaseGroupProfilePicker(){const root=document.querySelector('#modalRoot'),available=availableGroupOutlookProfiles(),stored=groupOutlookSelection(),picked=new Set(stored===null?available.map(profile=>profile.key):stored);const draw=()=>{root.innerHTML=`<div class="modal-backdrop"><section class="modal group-profile-picker" role="dialog" aria-modal="true"><p class="eyebrow">Group Rebirth Outlook</p><h2>Choose profiles</h2><p class="picker-hint">Choose exactly what appears on your Base page. This selection is private to your signed-in account on this browser and does not change what anyone else sees.</p><div class="group-profile-picker-actions"><button class="btn secondary" id="groupProfilesAll" type="button">Select all</button><button class="btn secondary" id="groupProfilesNone" type="button">Select none</button></div><div class="group-profile-picker-list">${available.map(profile=>`<label><input type="checkbox" data-base-group-profile="${escapeAttr(profile.key)}" ${picked.has(profile.key)?'checked':''}><span><strong>${escapeAttr(profile.profileName)}</strong><small>${escapeAttr(profile.ownerName)} · ${escapeAttr(profile.groupNames.join(', '))}</small></span></label>`).join('')||'<div class="empty">No connected profiles are available.</div>'}</div><div class="modal-actions"><button class="btn" id="applyGroupProfiles" type="button">Apply to Base</button><button class="btn ghost" id="cancelGroupProfiles" type="button">Cancel</button></div></section></div>`;root.querySelectorAll('[data-base-group-profile]').forEach(input=>input.onchange=()=>input.checked?picked.add(input.dataset.baseGroupProfile):picked.delete(input.dataset.baseGroupProfile));root.querySelector('#groupProfilesAll').onclick=()=>{available.forEach(profile=>picked.add(profile.key));draw()};root.querySelector('#groupProfilesNone').onclick=()=>{picked.clear();draw()};root.querySelector('#applyGroupProfiles').onclick=()=>{localStorage.setItem(groupOutlookStorageKey(),JSON.stringify([...picked]));root.innerHTML='';basePageV2()};root.querySelector('#cancelGroupProfiles').onclick=()=>root.innerHTML=''};draw()}
function combinedGroupOutlookHtml(){if(!cloudConnected()||!state.groups.workspace.length)return'';return`<section class="group-outlook-panel"><header><div><p class="eyebrow">Connected accounts</p><h2>Group Rebirth Outlook</h2><p>Selected profiles from your groups, together on one page.</p></div><button class="btn secondary" id="chooseBaseGroupProfiles" type="button">Choose profiles</button></header>${groupOutlookCardsHtml()}</section>`}
async function refreshConnectedGroupOutlooks(){const path=location.hash.slice(1).split('?')[0]||'/';if(!cloudConnected()||state.sharedView||!['/base','/groups'].includes(path)||document.hidden)return;try{await loadGroupWorkspace();document.querySelectorAll('.group-outlook-panel').forEach(panel=>{const current=panel.querySelector(':scope > .group-outlook-grid, :scope > .empty'),next=groupOutlookCardsHtml();if(current)current.outerHTML=next;else panel.insertAdjacentHTML('beforeend',next)})}catch{}}
setInterval(refreshConnectedGroupOutlooks,30000);
const personalBaseRebirthSummaryHtml=baseRebirthSummaryHtml;
baseRebirthSummaryHtml=()=>`${personalBaseRebirthSummaryHtml()}${notificationRecommendationsHtml()}${combinedGroupOutlookHtml()}${fusionOutlookHtml()}`;
let sharedProfileSaveTimer=null;
function scheduleSharedProfileSave(){clearTimeout(sharedProfileSaveTimer);sharedProfileSaveTimer=setTimeout(()=>saveSharedProfileNow().catch(error=>{toast(error.message);decorateSharedView()}),900)}
async function saveSharedProfileNow(){const view=state.sharedView;if(!view||!view.canEdit)return;clearTimeout(sharedProfileSaveTimer);if(view.saving)return view.savePromise.then(()=>state.sharedView===view?saveSharedProfileNow():undefined);view.saving=true;decorateSharedView();const profileData=profileDataFromState(),savedVersion=view.changeVersion||0;view.savePromise=(async()=>{const {data,error}=await supabaseClient.rpc('save_shared_droid_archive_profile',{target_group_id:view.groupId,target_owner_id:view.ownerId,target_profile_id:view.profileId,profile_data:profileData,expected_updated_at:view.profile.updatedAt||null});if(error)throw Error(error.message);view.profile.data=profileData;view.profile.updatedAt=data.updatedAt;view.savedVersion=savedVersion;const workspaceProfile=state.groups.workspace.find(group=>group.id===view.groupId)?.profiles?.find(profile=>profile.ownerId===view.ownerId&&profile.profileId===view.profileId);if(workspaceProfile){workspaceProfile.data=cloneProfileData(profileData);workspaceProfile.updatedAt=data.updatedAt}})();try{await view.savePromise}finally{view.saving=false;view.savePromise=null;decorateSharedView()}}
async function openGroupProfile(groupId,ownerId,profileId){if(!cloudConnected())return showAuthModal('signin');const group=state.groups.workspace.find(item=>item.id===groupId);if(!group)throw Error('That group is no longer available.');const profile=groupAvailableProfiles(group).find(item=>String(item.ownerId)===String(ownerId)&&String(item.profileId)===String(profileId));if(!profile)throw Error('That shared profile is no longer available.');if(String(profile.ownerId)===String(state.cloud.user.id)){switchCloudProfile(profile.profileId);location.hash='#/base';return}if(state.sharedView)await exitSharedProfile(false);clearTimeout(cloudSaveTimer);updateActiveCloudProfile();cacheCloudDocLocally();saveLocal();const view={groupId,groupName:group.name,ownerId:profile.ownerId,ownerName:profile.ownerName,profileId:profile.profileId,profileName:profile.profileName,profile:{...profile,data:cloneProfileData(profile.data)},canEdit:Boolean(profile.canEdit),saving:false,savePromise:null,changeVersion:0,savedVersion:0};state.sharedView=view;applyProfileData(view.profile.data);if(location.hash==='#/base')route();else location.hash='#/base';toast(`Viewing ${view.ownerName} · ${view.profileName}`)}
async function exitSharedProfile(goToGroups=true){if(!state.sharedView)return;let saveError=null;if(state.sharedView.canEdit)try{await saveSharedProfileNow()}catch(error){saveError=error}state.sharedView=null;const own=activeCloudProfile();if(own)applyProfileData(own.data);cacheCloudDocLocally();saveLocal();scheduleCloudSave();renderCloudHeader();if(saveError)toast(`Shared changes were not saved: ${saveError.message}`);if(goToGroups){location.hash='#/groups';route()}}
function decorateSharedView(){const view=state.sharedView;if(!view)return;let banner=app.querySelector('.shared-profile-banner');if(!banner){app.insertAdjacentHTML('afterbegin',`<section class="shared-profile-banner ${view.canEdit?'editable':'readonly'}"><div><small>${view.canEdit?'Shared editing enabled':'Read-only shared profile'}</small><strong>${escapeAttr(view.ownerName)} · ${escapeAttr(view.profileName)}</strong><span>${view.canEdit?'Changes sync to the owner’s profile.':'The owner has not allowed changes.'}</span></div><button class="btn secondary" data-shared-exit>Return to my profiles</button></section>`);banner=app.querySelector('.shared-profile-banner')}const status=banner.querySelector('small'),statusText=view.saving?'Saving shared profile…':view.canEdit?'Shared editing enabled':'Read-only shared profile';if(status&&status.textContent!==statusText)status.textContent=statusText;banner.querySelector('[data-shared-exit]').onclick=()=>exitSharedProfile().catch(error=>toast(error.message));if(!view.canEdit){app.querySelectorAll('button:not([data-shared-exit]),input,select,textarea').forEach(control=>control.disabled=true);document.querySelectorAll('#baseSidebarControls input,#baseSidebarControls select:not(#cloudProfileSelect),#baseSidebarControls button:not([data-shared-exit])').forEach(control=>control.disabled=true)}}
function connectCloud(){showAuthModal('signin')}
async function signOutCloud(){if(state.sharedView)await exitSharedProfile(false);if(supabaseClient)await supabaseClient.auth.signOut();state.cloud.session=null;state.cloud.user=null;clearKyberPreview();state.cloud.doc=null;state.groups={workspace:[],loading:false,loaded:false,error:'',loadPromise:null};state.sharedView=null;state.cloud.enabled=false;state.cloud.reconnecting=false;state.cloud.status='Local save';localStorage.setItem('droid-archive-sync-provider','local');toast('Signed out');route();renderCloudHeader()}
function showAuthModal(mode='signin'){const root=document.querySelector('#modalRoot');if(!supabaseReady()){root.innerHTML=`<div class="modal-backdrop"><section class="modal"><p class="eyebrow">Supabase setup</p><h2>Cloud save is not configured</h2><p>Add your Supabase URL and anon key to <code>data/supabase-config.json</code>, then refresh.</p><button class="btn ghost" id="closeAuth">Close</button></section></div>`;root.querySelector('#closeAuth').onclick=()=>root.innerHTML='';return}const isSignUp=mode==='signup',isReset=mode==='reset';root.innerHTML=`<div class="modal-backdrop"><section class="modal auth-modal"><p class="eyebrow">Supabase cloud save</p><h2>${isSignUp?'Create account':isReset?'Reset password':'Sign in'}</h2><p class="picker-hint">${isReset?'Enter the email you signed up with. The reset email has a link and, on this site, a code you can type instead.':'Your Droid Archives profiles sync to one row in Supabase.'}</p><label class="field">Email<input id="authEmail" class="form-control" type="email" autocomplete="email"></label>${isReset?'':`<label class="field">Password<input id="authPassword" class="form-control" type="password" autocomplete="${isSignUp?'new-password':'current-password'}"></label>`}<div class="modal-actions"><button class="btn" id="authSubmit">${isSignUp?'Create account':isReset?'Send reset email':'Sign in'}</button><button class="btn ghost" id="authCancel">Cancel</button></div><div class="auth-links">${isSignUp?'<button id="authSignin">Already have an account?</button>':'<button id="authSignup">Create account</button>'}${isReset?'':'<button id="authReset">Forgot password?</button>'}</div><p class="form-error" id="authError"></p></section></div>`;const error=root.querySelector('#authError'),submit=root.querySelector('#authSubmit');root.querySelector('#authCancel').onclick=()=>root.innerHTML='';root.querySelector('#authSignin')?.addEventListener('click',()=>showAuthModal('signin'));root.querySelector('#authSignup')?.addEventListener('click',()=>showAuthModal('signup'));root.querySelector('#authReset')?.addEventListener('click',()=>showAuthModal('reset'));submit.onclick=async()=>{try{submit.disabled=true;submit.textContent=isSignUp?'Creating…':isReset?'Sending…':'Signing in…';error.textContent='';const email=root.querySelector('#authEmail').value.trim(),password=root.querySelector('#authPassword')?.value||'';if(!email)throw Error('Email is required');state.cloud.status=isReset?'Sending reset…':'Signing in…';renderCloudHeader();if(isReset){const {error:e}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl()});if(e)throw e;showResetCodeModal(email);return}state.cloud.initializingNewAccount=isSignUp;const result=isSignUp?await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl()}}):await supabaseClient.auth.signInWithPassword({email,password});if(result.error)throw result.error;state.cloud.session=result.data.session;state.cloud.user=result.data.user;verifyKyberPreview();if(!state.cloud.session&&isSignUp){toast('Account created. Check your email to confirm it.');root.innerHTML='';return}await loadSupabaseProfiles(true,{initializeIfMissing:isSignUp});state.cloud.initializingNewAccount=false;root.innerHTML='';toast(isSignUp?'Account ready':'Signed in')}catch(e){state.cloud.initializingNewAccount=false;error.textContent=e.message;state.cloud.status=e.message;renderCloudHeader();submit.disabled=false;submit.textContent=isSignUp?'Create account':isReset?'Send reset email':'Sign in'}}}
// After the Supabase client has read a reset link: open the new-password form
// in case the auth event was missed, or explain a dead link. The tokens are
// cleared from the address bar either way.
function finishAuthCallback(){
  if(!AUTH_CALLBACK.present)return;
  try{history.replaceState(history.state,'',location.pathname+'#/')}catch{}
  if(AUTH_CALLBACK.error||AUTH_CALLBACK.errorCode){showAuthLinkProblem(AUTH_CALLBACK.error||AUTH_CALLBACK.errorCode);return}
  if(AUTH_CALLBACK.recovery&&!document.querySelector('#newPassword'))showPasswordUpdateModal();
}
function showAuthLinkProblem(reason){
  const root=document.querySelector('#modalRoot'),expired=/expired|invalid|otp/i.test(reason);
  root.innerHTML=`<div class="modal-backdrop"><section class="modal auth-modal"><p class="eyebrow">Password reset</p><h2>${expired?'That reset link has expired':'That link did not work'}</h2><p class="picker-hint">${expired?'Reset links work once and only for an hour. Some email apps open links in the background, which uses them up.':escapeAttr(reason)}</p><p class="picker-hint">Request a new one and use it straight away. If the email shows a code, you can type that here instead of opening the link.</p><div class="modal-actions"><button class="btn" id="authLinkRetry">Send a new reset email</button><button class="btn ghost" id="authLinkClose">Close</button></div></section></div>`;
  root.querySelector('#authLinkClose').onclick=()=>root.innerHTML='';
  root.querySelector('#authLinkRetry').onclick=()=>showAuthModal('reset');
}
// Second step of a reset. The email carries a link and, when the project's
// email template includes {{ .Token }}, a code. Either gets the account a
// session; the code never leaves this page, so it also works when the link was
// opened on another device or used up by an email scanner.
function showResetCodeModal(email){
  const root=document.querySelector('#modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><section class="modal auth-modal"><p class="eyebrow">Password reset</p><h2>Check your email</h2><p class="picker-hint">A reset email is on its way to ${escapeAttr(email)}. Check spam if nothing arrives within a minute. Open the link in it, or if it shows a code, enter the code here with your new password.</p><label class="field">Code from the email<input id="resetCode" class="form-control" inputmode="numeric" autocomplete="one-time-code"></label><label class="field">New password<input id="resetPassword" class="form-control" type="password" autocomplete="new-password"></label><label class="field">Repeat it<input id="resetPasswordAgain" class="form-control" type="password" autocomplete="new-password"></label><div class="modal-actions"><button class="btn" id="resetSubmit">Set new password</button><button class="btn ghost" id="resetClose">Close</button></div><div class="auth-links"><button id="resetResend">Send the email again</button></div><p class="form-error" id="resetError"></p></section></div>`;
  root.querySelector('#resetClose').onclick=()=>root.innerHTML='';
  root.querySelector('#resetResend').onclick=()=>showAuthModal('reset');
  const submit=root.querySelector('#resetSubmit'),error=root.querySelector('#resetError');
  submit.onclick=async()=>{
    const code=root.querySelector('#resetCode').value.replace(/\D/g,''),password=root.querySelector('#resetPassword').value,again=root.querySelector('#resetPasswordAgain').value;
    try{
      if(!code)throw Error('Enter the code from the email, or open the link in it');
      if(password.length<6)throw Error('Use at least 6 characters');
      if(password!==again)throw Error('The two passwords do not match');
      submit.disabled=true;submit.textContent='Checking…';
      const verified=await supabaseClient.auth.verifyOtp({email,token:code,type:'recovery'});if(verified.error)throw verified.error;
      const updated=await supabaseClient.auth.updateUser({password});if(updated.error)throw updated.error;
      root.innerHTML='';toast('Password updated. You are signed in.');
    }catch(e){submit.disabled=false;submit.textContent='Set new password';error.textContent=/expired|invalid|otp/i.test(e.message)?'That code is wrong or has expired. Codes last an hour; send the email again for a fresh one.':e.message}
  };
}
function showPasswordUpdateModal(){
  const root=document.querySelector('#modalRoot'),email=state.cloud.user?.email||'';
  root.innerHTML=`<div class="modal-backdrop"><section class="modal auth-modal"><p class="eyebrow">Password reset</p><h2>Choose a new password</h2><p class="picker-hint">${email?`For ${escapeAttr(email)}. `:''}At least 6 characters.</p><label class="field">New password<input id="newPassword" class="form-control" type="password" autocomplete="new-password"></label><label class="field">Repeat it<input id="newPasswordAgain" class="form-control" type="password" autocomplete="new-password"></label><div class="modal-actions"><button class="btn" id="saveNewPassword">Update password</button><button class="btn ghost" id="cancelNewPassword">Cancel</button></div><p class="form-error" id="passwordError"></p></section></div>`;
  root.querySelector('#cancelNewPassword').onclick=()=>root.innerHTML='';
  const save=root.querySelector('#saveNewPassword');
  save.onclick=async()=>{
    const password=root.querySelector('#newPassword').value,again=root.querySelector('#newPasswordAgain').value,error=root.querySelector('#passwordError');
    try{
      if(password.length<6)throw Error('Use at least 6 characters');
      if(password!==again)throw Error('The two passwords do not match');
      save.disabled=true;save.textContent='Updating…';
      const {error:e}=await supabaseClient.auth.updateUser({password});if(e)throw e;
      root.innerHTML='';toast('Password updated. You are signed in.');state.cloud.status='Signed in';renderCloudHeader();
    }catch(e){save.disabled=false;save.textContent='Update password';error.textContent=/session missing|not logged in|jwt/i.test(e.message)?'This reset link has expired or was already used. Request a new one and open it straight away.':e.message}
  };
}
async function waitForGoogle(){for(let i=0;i<40;i++){if(window.google?.accounts?.oauth2)return;if(i===0&&!document.querySelector('script[src*="accounts.google.com/gsi/client"]')){const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;document.head.appendChild(s)}await new Promise(r=>setTimeout(r,125))}throw Error('Google sign-in did not load.')}
async function cloudAuth(promptMode,timeoutMs=12000){await waitForGoogle();return new Promise((resolve,reject)=>{let settled=false;let timer;const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);fn(value)};state.cloud.tokenClient ||= google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:DRIVE_SCOPE,include_granted_scopes:true,callback:res=>{if(res.error){finish(reject,Error(res.error));return}state.cloud.token=res.access_token;state.cloud.tokenExpiresAt=Date.now()+((Number(res.expires_in)||3600)-60)*1000;finish(resolve,res.access_token)}});timer=setTimeout(()=>finish(reject,Error('Google Drive import could not connect')),timeoutMs);state.cloud.tokenClient.requestAccessToken({prompt:promptMode??'consent'})})}
async function driveFetch(path,options={}){const response=await fetch(`https://www.googleapis.com/drive/v3/${path}`,{...options,headers:{Authorization:`Bearer ${state.cloud.token}`,...(options.headers||{})}});if(!response.ok)throw Error(`Google Drive import failed (${response.status})`);return response}
async function findCloudFile(){const q=encodeURIComponent(`name='${CLOUD_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`),response=await driveFetch(`files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=${q}`),data=await response.json();return data.files?.[0]||null}
function multipartBody(metadata,json){const boundary='droid-archives-boundary';return{boundary,body:`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(json,null,2)}\r\n--${boundary}--`}}
async function readCloudDoc(fileId){const response=await driveFetch(`files/${fileId}?alt=media`);return normalizeCloudDoc(await response.json())}
async function importGoogleDriveProfiles(){try{if(!cloudConnected()){toast('Sign in with Supabase first');return}state.cloud.status='Importing Google Drive profiles…';renderCloudHeader();await cloudAuth('consent',30000);const file=await findCloudFile();if(!file){toast('No Google Drive save found');return}const imported=await readCloudDoc(file.id),current=state.cloud.doc,seen=new Set(current.profiles.map(p=>p.id));imported.profiles.forEach((profile,index)=>{const id=seen.has(profile.id)?cloudId():profile.id;seen.add(id);current.profiles.push({...profile,id,name:`Google: ${profile.name||`Profile ${index+1}`}`})});if(imported.profiles.length&&!current.activeProfileId)current.activeProfileId=current.profiles[0].id;await cloudSaveNow();toast(`Imported ${imported.profiles.length} Google profile${imported.profiles.length===1?'':'s'}`)}catch(e){state.cloud.status=e.message;renderCloudHeader();toast(e.message)}}
function addCloudProfile(){const doc=activeProfileDoc(),root=document.querySelector('#modalRoot');root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><p class="eyebrow">Profile setup</p><h2>Create new profile</h2><p class="picker-hint">Copy your current Base/settings, or start fresh. Droidex always starts empty for a new profile.</p><label class="field">Profile name<input id="newProfileName" class="form-control" value="New profile"></label><p class="form-error" id="newProfileError"></p><div class="modal-actions"><button class="btn" id="copyProfile">Copy Base/settings</button><button class="btn secondary" id="blankProfile">Start blank profile</button><button class="btn ghost" id="cancelProfile">Cancel</button></div></section></div>`;const nameInput=root.querySelector('#newProfileName'),error=root.querySelector('#newProfileError'),create=mode=>{const name=nameInput.value.trim();if(!name){error.textContent='Profile name is required';return}if(cloudConnected())updateActiveCloudProfile();else updateActiveLocalProfile();const id=cloudId(),data=mode==='copy'?cloneProfileBaseOnly(profileDataFromState()):blankProfileData();doc.profiles.push({id,name,updatedAt:new Date().toISOString(),data});state.cloud.activeProfileId=id;doc.activeProfileId=id;applyProfileData(data);save();root.innerHTML='';route();toast(`Profile created: ${name}`)};root.querySelector('#copyProfile').onclick=()=>create('copy');root.querySelector('#blankProfile').onclick=()=>create('blank');root.querySelector('#cancelProfile').onclick=()=>root.innerHTML='';nameInput.focus();nameInput.select()}
function renameCloudProfile(){const profile=activeProfile();if(!profile)return;const name=prompt('Rename profile:',profile.name)?.trim();if(!name)return;profile.name=name;save();route();toast('Profile renamed')}
function deleteCloudProfile(){const doc=activeProfileDoc(),profile=activeProfile();if(!profile)return;if(doc.profiles.length<=1){toast('You need at least one profile');return}if(!confirm(`Delete profile "${profile.name}"? A recoverable cloud history snapshot will be retained.`))return;doc.profiles=doc.profiles.filter(p=>p.id!==profile.id);if(cloudConnected())state.cloud.allowProfileCountDecrease=true;state.cloud.activeProfileId=doc.profiles[0].id;doc.activeProfileId=state.cloud.activeProfileId;applyProfileData(activeProfile().data);save();route();toast('Profile deleted')}
function switchCloudProfile(id){if(state.sharedView){
  // Your own data is back once the shared view is left, but choosing the profile
  // that was already active changes nothing further, so the page and the menu
  // have to be redrawn here or the shared base stays on screen.
  exitSharedProfile(false).then(()=>{if(id===state.cloud.activeProfileId||!activeProfileDoc()){route();toast(`Back on ${activeProfile()?.name||'your profile'}`)}else switchCloudProfile(id)}).catch(error=>toast(error.message));return}const doc=activeProfileDoc();if(!doc||id===state.cloud.activeProfileId)return;if(cloudConnected())updateActiveCloudProfile();else updateActiveLocalProfile();state.cloud.activeProfileId=id;doc.activeProfileId=id;applyProfileData(activeProfile().data);save();route();toast(`Switched to ${activeProfile()?.name||'profile'}`)}
// Group profiles rendered as <optgroup>s under your own, so switching to one is
// the same gesture as switching to your own. Values are prefixed so the change
// handler can tell the two apart.
const GROUP_PROFILE_PREFIX='group:';
function groupProfileOptions(){
  if(!cloudConnected()||!state.groups.workspace.length)return'';
  return state.groups.workspace.map(group=>{
    const rows=groupAvailableProfiles(group).filter(item=>!item.isOwn);
    if(!rows.length)return'';
    const options=rows.map(item=>{
      const value=`${GROUP_PROFILE_PREFIX}${group.id}:${item.ownerId}:${item.profileId}`;
      const current=state.sharedView&&state.sharedView.profileId===item.profileId&&String(state.sharedView.ownerId)===String(item.ownerId);
      return `<option value="${escapeAttr(value)}" ${current?'selected':''}>${escapeAttr(item.ownerName)} · ${escapeAttr(item.profileName)}${item.canEdit?'':' (read only)'}</option>`;
    }).join('');
    return `<optgroup label="${escapeAttr(group.name||'Group')}">${options}</optgroup>`;
  }).join('');
}
// The profile picker. Both panels use it, so a group profile is reachable from
// inside another one and not only from your own profiles: openGroupProfile and
// switchCloudProfile each bow out of the shared view they find before opening the
// next, so hopping straight across works without a trip through Groups.
//   While a shared profile is open, none of your own options is marked selected.
// groupProfileOptions marks the open one instead, and two selected options would
// leave the control showing your last profile while somebody else's base is on
// screen.
function profileSelectHtml(){
  const doc=activeProfileDoc(),profiles=doc?.profiles||[],shared=Boolean(state.sharedView);
  const mine=profiles.map(p=>`<option value="${escapeAttr(p.id)}" ${!shared&&p.id===state.cloud.activeProfileId?'selected':''}>${escapeAttr(p.name)}</option>`).join('');
  const theirs=groupProfileOptions();
  return `<label class="side-field">Profile<select id="cloudProfileSelect">${theirs?`<optgroup label="Your profiles">${mine}</optgroup>${theirs}`:mine}</select></label>`;
}
function cloudSidebarHtml(){if(state.sharedView){const view=state.sharedView;return`<div class="cloud-panel shared-cloud-panel"><p class="side-title">Shared profile</p><strong>${escapeAttr(view.ownerName)} · ${escapeAttr(view.profileName)}</strong><small class="cloud-status">${view.saving?'Saving…':view.canEdit?'Editing allowed':'Read only'}</small>${profileSelectHtml()}<div class="cloud-actions"><button class="btn secondary" data-shared-exit>Return to my profiles</button>${view.canEdit?'<button class="btn secondary" id="cloudSyncNow">Save shared profile</button>':''}</div><div class="side-rule"></div></div>`}const connected=cloudConnected(),doc=activeProfileDoc(),profiles=doc?.profiles||[],active=activeProfile(),needsLogin=state.cloud.enabled&&!connected&&!state.cloud.reconnecting,reconnecting=state.cloud.enabled&&!connected&&state.cloud.reconnecting,setup=!supabaseReady();return `<div class="cloud-panel ${needsLogin||setup?'cloud-needs-login':''} ${reconnecting?'cloud-reconnecting':''}"><p class="side-title">${connected?'Cloud save':'Profiles'}</p>${profileSelectHtml()}<small class="cloud-status">${setup?'Supabase setup needed':connected?state.cloud.status:reconnecting?'Restoring Supabase session…':needsLogin?'SIGNED OUT — changes save locally only':'Local profiles'}${active?` · ${active.name}`:''}</small>${setup?'<div class="cloud-warning">Add data/supabase-config.json to enable account sync.</div>':needsLogin?'<div class="cloud-warning">You are signed out. Local changes will not sync until you sign in.</div>':''}<div class="cloud-actions">${connected?'<button class="btn secondary" id="cloudSyncNow">Sync now</button><button class="btn secondary" id="cloudImportGoogle">Import Google Drive profiles</button>':reconnecting?'<button class="btn secondary" disabled>Restoring…</button>':'<button class="btn secondary cloud-connect" id="cloudConnect">Sign in</button><button class="btn secondary" id="cloudCreateAccount">Create account</button><button class="btn secondary" id="cloudResetPassword">Reset password</button>'}${kyberPreviewVerified?'<a class="btn secondary" href="#/site-stats">Site statistics</a>':''}<button class="btn secondary" id="cloudNewProfile">New profile</button><button class="btn secondary" data-archive-action="setup">Guided setup</button><button class="btn secondary" data-archive-action="history">Save history</button><button class="btn secondary" data-archive-action="share">Share progress</button><button class="btn secondary" id="cloudRenameProfile">Rename</button><button class="btn danger" id="cloudDeleteProfile">Delete</button>${connected?'<button class="btn ghost" id="cloudSignOut">Sign out</button>':''}</div><div class="side-rule"></div></div>`}
function attachCloudSidebarHandlers(root=document){root.querySelector('#cloudConnect')?.addEventListener('click',()=>showAuthModal('signin'));root.querySelector('#cloudCreateAccount')?.addEventListener('click',()=>showAuthModal('signup'));root.querySelector('#cloudResetPassword')?.addEventListener('click',()=>showAuthModal('reset'));root.querySelector('#cloudSyncNow')?.addEventListener('click',()=>cloudSaveNow().catch(e=>toast(e.message)));root.querySelector('#cloudImportGoogle')?.addEventListener('click',importGoogleDriveProfiles);root.querySelector('#cloudNewProfile')?.addEventListener('click',addCloudProfile);root.querySelector('#cloudRenameProfile')?.addEventListener('click',renameCloudProfile);root.querySelector('#cloudDeleteProfile')?.addEventListener('click',deleteCloudProfile);root.querySelector('#cloudSignOut')?.addEventListener('click',signOutCloud);root.querySelector('#cloudProfileSelect')?.addEventListener('change',async e=>{
    const value=e.target.value;
    if(!value.startsWith(GROUP_PROFILE_PREFIX))return switchCloudProfile(value);
    // group:<groupId>:<ownerId>:<profileId> — ids can contain colons, so split
    // off the first two and keep the remainder whole.
    const rest=value.slice(GROUP_PROFILE_PREFIX.length),cut=rest.indexOf(':'),groupId=rest.slice(0,cut);
    const after=rest.slice(cut+1),cut2=after.indexOf(':');
    try{await openGroupProfile(groupId,after.slice(0,cut2),after.slice(cut2+1))}
    catch(error){toast(error.message);route()}
  });// From the profile menu you stay on the page you were on, now with your own profile.
  root.querySelector('[data-shared-exit]')?.addEventListener('click',()=>exitSharedProfile(false).then(()=>{route();toast(`Back on ${activeProfile()?.name||'your profile'}`)}).catch(error=>toast(error.message)))}
function renderCloudHeader(){siteActivity?.accountChanged(state.cloud.user?.id);const host=document.querySelector('#headerCloud');if(!host)return;const connected=cloudConnected(),doc=activeProfileDoc(),profiles=doc?.profiles||[],active=activeProfile(),needsLogin=state.cloud.enabled&&!connected&&!state.cloud.reconnecting,reconnecting=state.cloud.enabled&&!connected&&state.cloud.reconnecting,setup=!supabaseReady(),profileLabel=state.sharedView?state.sharedView.profileName:connected?active?.name||'Profile':'Account',menuLabel=state.sharedView?`Shared profile: ${profileLabel}`:connected?`Profiles: ${profileLabel}`:'Account and profiles';host.innerHTML=`<button class="cloud-menu-button ${connected?'connected':''} ${needsLogin||setup?'needs-login':''} ${reconnecting?'reconnecting':''}" id="cloudMenuButton" aria-label="${escapeAttr(menuLabel)}" aria-expanded="false" title="${setup?'Supabase setup needed':connected?`Active profile: ${escapeAttr(profileLabel)}`:reconnecting?'Restoring Supabase session':needsLogin?'Signed out':'Sign in or manage local profiles'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0H5Z"/></svg><strong>${escapeAttr(profileLabel)}</strong>${needsLogin||setup?'<i aria-hidden="true">!</i>':''}</button><div class="cloud-dropdown ${needsLogin||setup?'cloud-needs-login':''} ${reconnecting?'cloud-reconnecting':''}" id="cloudDropdown" hidden>${cloudSidebarHtml().replace('<div class="side-rule"></div>','')}</div>`;const button=host.querySelector('#cloudMenuButton'),dropdown=host.querySelector('#cloudDropdown');button.onclick=e=>{e.stopPropagation();document.querySelector('.sidebar').classList.remove('mobile-open');dropdown.hidden=!dropdown.hidden;button.setAttribute('aria-expanded',String(!dropdown.hidden))};dropdown.onclick=e=>e.stopPropagation();attachCloudSidebarHandlers(host);publishCompanionState()}
// Picking preferred companions from a grid of portraits rather than a listbox,
// so it reads like the rest of the Base.
function showPreferredCompanionPicker(onDone){
  const root=document.querySelector('#modalRoot'),render=()=>{
    const chosen=preferredCompanions(),slots=companionSlotCount(),full=preferredCompanionsFull();
    root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><p class="eyebrow">Companion slot</p><h2>Preferred companions</h2><p class="picker-hint">These take a Companion slot ahead of any boost. Optimise will tell you to buy any you do not own.</p><p class="picker-hint companion-count">${chosen.length} of ${slots} slot${slots===1?'':'s'} spoken for${full?' · remove one to swap':''}</p><div class="companion-choice">${iconicDroids().map(d=>{const owned=state.owned.some(x=>x.name===d.name),on=chosen.includes(d.name);return `<button data-pick-companion="${d.name}" class="${on?'picked':''}" ${!on&&full?'disabled':''}>${picture(d,'DEFAULT')}<strong>${d.name}</strong><small>${on?'Preferred':owned?'Owned':'Not owned yet'}</small></button>`}).join('')}</div><button class="btn ghost" id="closeCompanionPicker">Done</button></section></div>`;
    root.querySelectorAll('[data-pick-companion]').forEach(button=>button.onclick=()=>{
      const name=button.dataset.pickCompanion,list=preferredCompanions();
      if(!list.includes(name)&&preferredCompanionsFull())return;
      state.preferredCompanions=list.includes(name)?list.filter(x=>x!==name):[...list,name];
      save();render();onDone?.();
    });
    root.querySelector('#closeCompanionPicker').onclick=()=>{root.innerHTML='';onDone?.()};
  };
  render();
}
const optimiseSettingsOpen=()=>localStorage.getItem('droid-archive-optimise-settings-open')==='1';
const optimiseSettingsSummary=()=>{const boosts=companionGoals().length,preferred=preferredCompanions().length;return `${boosts} boost${boosts===1?'':'s'}${preferred?` · ${preferred} preferred`:''}`};
function renderBaseSidebar(rerender){const host=document.querySelector('#baseSidebarControls');host.innerHTML=`${cloudSidebarHtml()}<p class="side-title">Base settings</p><label class="side-field">Current credit multiplier<input id="sideMultiplier" type="number" min="0" step="0.1" value="${state.multiplier}"><small class="flawless-bonus">${multiplierHelp()}</small></label><label class="side-field">Super rebirth<select id="sideCycle">${Object.keys(state.rebirths).map(c=>`<option value="${c}" ${Number(c)===state.cycle?'selected':''}>Cycle ${Number(c)+1}</option>`).join('')}</select></label><label class="side-field">Current rebirth<select id="sideRebirth">${Array.from({length:maxRebirth()+1},(_,n)=>`<option ${n===state.rebirth?'selected':''}>${n}</option>`).join('')}</select></label><label class="side-field">Super rebirth goal<select id="sideRebirthGoal">${Array.from({length:Math.max(0,maxRebirth()-11)},(_,i)=>i+12).map(n=>`<option value="${n}" ${n===rebirthGoal()?'selected':''}>Rebirth ${n}</option>`).join('')}</select><small class="flawless-bonus">Base recommendations stop after this rebirth.</small></label><details class="side-group" ${optimiseSettingsOpen()?'open':''}><summary>Advanced settings<em>${optimiseSettingsSummary()}</em></summary><div class="side-group-body">${protocolPrioritySetting()}<div class="side-field side-fusion-controls"><span class="side-fusion-buttons">${fusionKeepSettings()}<button class="btn secondary" type="button" data-fusion-settings>Fusion settings</button></span><small class="flawless-bonus">Keep for fusion: which spares are never sold. Fusion settings: what to fuse for — higher rarity, variant upgrades or Mythic rerolls.</small></div><div class="side-field"><button class="btn secondary" type="button" data-astromech-settings>Astromech Settings</button><small class="flawless-bonus">Choose Mission or Credit Gain for CB-23 and other Astromech Iconics.</small></div><label class="side-field side-min-gain">Skip Optimise moves under<span class="side-min-gain-input"><input id="sideOptimiseMinGain" type="number" min="0" max="20" step="0.1" value="${optimiseMinGainPercent()}"><em>% of income</em></span><small class="flawless-bonus">Working droids change rooms when the gain clears this threshold. Idle droids can still fill empty work slots. 0 plans every gain, however small.</small></label><div class="side-field side-pillfield">Companion boosts<div class="side-pills">${COMPANION_GOALS.map(g=>`<label class="side-pill"><input type="checkbox" data-companion-goal="${g.id}" ${companionGoals().includes(g.id)?'checked':''}><span>${g.short}</span></label>`).join('')}</div><small class="flawless-bonus">A Companion slot is stocked for each boost picked.</small></div><div class="side-field">Preferred companions<div class="side-companions">${preferredCompanions().map(name=>{const d=state.droids.find(x=>x.name===name);return `<span class="side-companion" title="${name}">${picture(d,'DEFAULT')}<b>${name}</b><button class="side-companion-remove" data-remove-companion="${name}" title="Remove ${name}" aria-label="Remove ${name}">×</button></span>`}).join('')}${preferredCompanionsFull()?'':`<button class="side-companion-add" id="addPreferredCompanion" title="Add a preferred companion" aria-label="Add a preferred companion"><span class="slot-icon">${stationIcon('COMPANION')}</span><small>${preferredCompanions().length?'Add':'Add preferred companion'}</small></button>`}</div><small class="flawless-bonus">Taken ahead of any boost.</small></div>${iconicPlanningToggleHtml()}<label class="side-check"><input id="sideKeepDroidex" type="checkbox" ${state.optimiseKeepDroidex===false?'':'checked'}> Keep droids that can fill the Droidex</label><label class="side-check"><input id="sideKeepProtocol" type="checkbox" ${state.optimiseKeepProtocol===false?'':'checked'}> Never sell a Protocol droid while a Protocol slot is free</label><label class="side-check"><input id="sideAutoCompleteBuilds" type="checkbox" ${state.autoCompleteBuilds?'checked':''}> Auto complete Build droids</label><label class="side-check"><input id="sideOptimiseFreeBuild" type="checkbox" ${state.optimiseFreeBuild?'checked':''}> Keep Build slots open in Optimise</label><label class="side-check"><input id="sideFusionHints" type="checkbox" ${fusionHintsEnabled()?'checked':''}> Show fusion uses in the droid picker</label><label class="side-check" title="Lets Optimise park spare droids in Fusion slots. Anything left there is what a Fuse consumes."><input id="sideFusionAsLounge" type="checkbox" ${state.fusionAsLounge?'checked':''}> Use Fusion as Lounge slots</label><label class="side-check" title="Shows each region's credits and Protocol bonuses above your stations."><input id="sideShowRegionalProduction" type="checkbox" ${state.showRegionalProduction===false?'':'checked'}> Show Regional production</label><label class="side-field optimise-free-build-mode" ${state.optimiseFreeBuild?'':'hidden'}>Sell priority<select id="sideOptimiseFreeBuildMode"><option value="upgrade-cost" ${optimiseFreeBuildMode()==='upgrade-cost'?'selected':''}>Highest upgrade cost</option><option value="rarity-income" ${optimiseFreeBuildMode()==='rarity-income'?'selected':''}>Lowest rarity + earnings</option></select><small class="flawless-bonus">Used when Optimise must sell stored future-use droids.</small></label></div></details><button class="btn danger super-rebirth-button" id="superRebirthButton">Super rebirth</button><div class="side-rule"></div>`;attachCloudSidebarHandlers(host);host.querySelector('#protocolPriority').onchange=e=>{state.protocolPriority=e.target.value;save();rerender()};host.querySelector('#sideMultiplier').onchange=e=>{state.multiplier=Math.max(1,Number(e.target.value)||1);save();rerender()};host.querySelector('#sideCycle').onchange=e=>{state.cycle=Number(e.target.value);save();rerender()};host.querySelector('#sideRebirth').onchange=e=>{state.rebirth=Number(e.target.value);save();rerender()};host.querySelector('#sideRebirthGoal').onchange=e=>{state.superRebirthGoal=Number(e.target.value)||maxRebirth();save();rerender()};host.querySelector('details.side-group')?.addEventListener('toggle',e=>localStorage.setItem('droid-archive-optimise-settings-open',e.target.open?'1':'0'));host.querySelectorAll('[data-companion-goal]').forEach(box=>box.onchange=()=>{state.companionGoals=[...host.querySelectorAll('[data-companion-goal]')].filter(x=>x.checked).map(x=>x.dataset.companionGoal);save();rerender()});host.querySelectorAll('[data-remove-companion]').forEach(button=>button.onclick=()=>{state.preferredCompanions=preferredCompanions().filter(name=>name!==button.dataset.removeCompanion);save();rerender()});const addCompanion=host.querySelector('#addPreferredCompanion');if(addCompanion)addCompanion.onclick=()=>showPreferredCompanionPicker(rerender);host.querySelector('#sideOptimiseMinGain').onchange=e=>{state.optimiseMinGainPercent=Math.max(0,Math.min(20,Number(e.target.value)||0));localStorage.setItem('droid-archive-optimise-min-gain',String(state.optimiseMinGainPercent));save();rerender()};host.querySelector('#sideKeepDroidex').onchange=e=>{state.optimiseKeepDroidex=e.target.checked;save();rerender()};host.querySelector('#sideKeepProtocol').onchange=e=>{state.optimiseKeepProtocol=e.target.checked;save();rerender()};host.querySelector('#sideAutoCompleteBuilds').onchange=e=>{state.autoCompleteBuilds=e.target.checked;save();rerender()};host.querySelector('#sideFusionHints').onchange=e=>localStorage.setItem('droid-archive-picker-fusion-hints',e.target.checked?'1':'0');host.querySelector('#sideFusionAsLounge').onchange=e=>{state.fusionAsLounge=e.target.checked;save();rerender()};host.querySelector('#sideShowRegionalProduction').onchange=e=>{state.showRegionalProduction=e.target.checked;save();rerender()};host.querySelector('#sideOptimiseFreeBuild').onchange=e=>{state.optimiseFreeBuild=e.target.checked;save();rerender()};host.querySelector('#sideOptimiseFreeBuildMode').onchange=e=>{state.optimiseFreeBuildMode=e.target.value;save();rerender()};host.querySelector('#superRebirthButton').onclick=()=>showSuperRebirthConfirm(rerender)}
const renderBaseSidebarWithoutOptimiseHelp=renderBaseSidebar;
const changeCurrentRebirth=(value,rerender)=>{const next=Math.max(0,Math.min(maxRebirth(),Math.trunc(Number(value)||0)));state.multiplier=Math.max(1,rebirthMultiplierAt(state.multiplier,state.rebirth,next));state.rebirth=next;const changed=autoPurchaseEligibleSlots();save();if(changed)toast('Newly eligible slots purchased');rerender()};
renderBaseSidebar=rerender=>{
  renderBaseSidebarWithoutOptimiseHelp(rerender);
  const host=document.querySelector('#baseSidebarControls'),toggle=host.querySelector('#sideOptimiseFreeBuild')?.closest('label'),modeLabel=host.querySelector('.optimise-free-build-mode'),select=host.querySelector('#sideOptimiseFreeBuildMode'),mode=optimiseFreeBuildMode();
  if(toggle){toggle.insertAdjacentHTML('beforebegin',`<label class="side-check slot-auto-purchase" title="Automatically purchase every rebirth slot as soon as your selected rebirth makes it eligible."><input id="sideAutoPurchaseSlots" type="checkbox" ${state.autoPurchaseSlots?'checked':''}> Auto purchase slots</label>`);host.querySelector('#sideAutoPurchaseSlots').onchange=e=>{state.autoPurchaseSlots=e.target.checked;const changed=autoPurchaseEligibleSlots();save();toast(state.autoPurchaseSlots?changed?'Eligible slots purchased':'Auto purchase slots enabled':'Auto purchase slots disabled');rerender()}}
  const rebirthSelect=host.querySelector('#sideRebirth');if(rebirthSelect){const stepper=document.createElement('div');stepper.className='side-stepper';stepper.innerHTML=`<button type="button" data-rebirth-step="-1" aria-label="Decrease current rebirth" ${state.rebirth<=0?'disabled':''}>−</button><button type="button" data-rebirth-step="1" aria-label="Increase current rebirth" ${state.rebirth>=maxRebirth()?'disabled':''}>+</button>`;rebirthSelect.before(stepper);stepper.insertBefore(rebirthSelect,stepper.lastElementChild);rebirthSelect.onchange=e=>changeCurrentRebirth(e.target.value,rerender);stepper.querySelectorAll('[data-rebirth-step]').forEach(button=>button.onclick=()=>changeCurrentRebirth(state.rebirth+Number(button.dataset.rebirthStep),rerender))}
  if(toggle){const help='When enabled, Optimise tries to clear Build slots. Sell Priority controls which droids may be removed when safe storage is full.';toggle.title=help;toggle.insertAdjacentHTML('beforeend',`<span class="setting-help" tabindex="0" title="${help}" aria-label="${help}">?</span>`)}
  if(select){if(!select.querySelector('[value="unused-income"]'))select.insertAdjacentHTML('beforeend','<option value="unused-income">No further use, lowest earnings</option>');select.value=mode;select.title=optimiseFreeBuildModeHelp(mode);[...select.options].forEach(option=>option.title=optimiseFreeBuildModeHelp(option.value))}
  if(modeLabel){const labelHelp='Choose which droids Optimise is allowed to sell while trying to free Build slots.';modeLabel.title=labelHelp;modeLabel.insertAdjacentHTML('afterbegin',`<span class="setting-label-row"><span>Sell priority</span><span class="setting-help" tabindex="0" title="${labelHelp}" aria-label="${labelHelp}">?</span></span>`);for(const node of [...modeLabel.childNodes])if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()==='Sell priority')node.remove();const note=modeLabel.querySelector('small');if(note)note.textContent=optimiseFreeBuildModeHelp(mode)}
};
const pickerMultiAddEnabled=()=>localStorage.getItem('droid-archive-picker-multi-add')!=='0';
function showSlotPicker(station,onDone,slot){const root=document.querySelector('#modalRoot'),allowed=isProtocolStation(station)?state.droids.filter(d=>canUseStation(d,station)):station==='UPGRADE_CHIP'?state.droids.filter(d=>UPGRADE_CHIP_RATES[d.rarity]):state.droids,productive=PRODUCTIVE_STATIONS.includes(station),hint=isProtocolStation(station)?protocolSlotHint(station):productive?'Any droid can use this station. Matching the droid’s type grants it +10% credits.':station==='UPGRADE_CHIP'?'The assigned droid produces Upgrade Chips instead of credits while you are online. The station stores up to one hour of chips.':'This workstation stores a droid without contributing to Base credit production.';root.innerHTML=`<div class="modal-backdrop"><section class="modal slot-picker" role="dialog" aria-modal="true"><p class="eyebrow">${station==='BUILD'?'Universal build':stationName(station)} slot</p><h2>Choose ${isProtocolStation(station)?'a Protocol':station==='UPGRADE_CHIP'?'a rated':'any'} droid</h2><p class="picker-hint">${hint}</p><label class="picker-mode"><input id="pickerMultiAdd" type="checkbox" ${pickerMultiAddEnabled()?'checked':''}><span><strong>Multi-add</strong><small>Keep this picker open until the station is full or you press Esc.</small></span></label><input id="slotSearch" class="form-control picker-search" placeholder="Search droids…" autofocus><div id="pickerResults" class="picker-results"></div><button class="btn ghost" id="cancelPicker">Cancel</button></section></div>`;const draw=()=>{const q=root.querySelector('#slotSearch').value.toLowerCase();root.querySelector('#pickerResults').innerHTML=allowed.filter(d=>d.name.toLowerCase().includes(q)).map(d=>`<button class="picker-droid ${d.type===station?'type-match':''}" data-name="${d.name}"><span>${picture(d)}</span><b>${d.name}</b><small>${rarityText(d.rarity)} &middot; ${d.type}${productive&&d.type===station?' &middot; +10%':''}</small>${fusionUsesHtml(d.name)}</button>`).join('')||'<p class="roster-empty">No matching droids.</p>';root.querySelectorAll('.picker-droid').forEach(b=>b.onclick=()=>showVariantChoice(b.dataset.name,station,onDone,slot))};root.querySelector('#pickerMultiAdd').onchange=e=>localStorage.setItem('droid-archive-picker-multi-add',e.target.checked?'1':'0');root.querySelector('#slotSearch').oninput=draw;root.querySelector('#cancelPicker').onclick=()=>root.innerHTML='';draw()}
// Every modal that has a search box behaves the same way: it takes focus the
// moment it opens, Enter picks the top result, Escape closes it. Driven off a
// mutation observer rather than each call site so new modals get it for free.
const MODAL_RESULT_SELECTOR='.picker-droid,.picker-results button,.variant-choice button,[data-pick-companion],.swap-choice button,.picker-results a';
const closeModalRoot=()=>{const root=document.querySelector('#modalRoot');if(root&&root.innerHTML)root.innerHTML=''};
function wireModalSearch(){
  const root=document.querySelector('#modalRoot');
  if(!root)return;
  const input=root.querySelector('.picker-search,.modal input[type="search"],.modal input[id$="Search"]');
  if(!input||input.dataset.searchWired)return;
  input.dataset.searchWired='1';
  input.focus({preventScroll:true});
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();root.querySelector(MODAL_RESULT_SELECTOR)?.click()}
    else if(event.key==='Escape'){event.preventDefault();closeModalRoot()}
  });
}
function attachModalBehaviour(){
  const root=document.querySelector('#modalRoot');
  if(!root||root.dataset.behaviourWired)return;
  root.dataset.behaviourWired='1';
  new MutationObserver(wireModalSearch).observe(root,{childList:true,subtree:true});
  // Escape closes a modal even when the search box does not have focus.
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModalRoot()});
  wireModalSearch();
}
// Where the copies you already own are sitting, condensed to fit on one line of
// the Rebirth outlook: "Worker ×2 · Lounge".
function droidWhereabouts(name,placed){
  const counts=new Map();
  for(const x of placed)if(x.name===name)counts.set(stationName(x.station),(counts.get(stationName(x.station))||0)+1);
  return [...counts].map(([label,n])=>n>1?`${label} ×${n}`:label).join(' · ');
}
const nextFreeSlot=station=>{const used=new Set(placements().placed.filter(x=>x.station===station).map(x=>x.slot));return slotFillOrder(station).find(i=>!used.has(i))??-1};
// Filling a station is usually several droids in a row, so the picker reopens on
// the next free slot instead of making you click back in each time. Escape or a
// full station ends it.
function afterDroidAdded(station,onDone){onDone?.();if(!pickerMultiAddEnabled())return;const next=nextFreeSlot(station);if(next>=0)showSlotPicker(station,onDone,next)}
function showVariantChoice(name,station,onDone,slot){const root=document.querySelector('#modalRoot'),d=state.droids.find(x=>x.name===name);if(isIconic(d)){commitOwned(name,'DEFAULT',1,station,slot);root.innerHTML='';afterDroidAdded(station,onDone);return}root.innerHTML=`<div class="modal-backdrop"><section class="modal"><p class="eyebrow">${station} slot</p><h2>Add ${name}</h2><div class="variant-choice">${DISPLAY_VARIANTS.map(v=>`<button data-variant="${v}">${picture(d,v)}<strong>${variantText(v)}</strong><small>${isProtocolStation(station)?protocolVariantText(d,v,station):station==='UPGRADE_CHIP'?`${fmt(upgradeChipRate(d,v))} chips/min`:variantIncomeText(d,v)}</small></button>`).join('')}</div><button class="btn ghost" id="backToPicker">Back</button></section></div>`;root.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>{commitOwned(name,b.dataset.variant,1,station,slot);root.innerHTML='';afterDroidAdded(station,onDone)});root.querySelector('#backToPicker').onclick=()=>showSlotPicker(station,onDone,slot)}
function showBlueprintPicker(slot,onDone){const root=document.querySelector('#modalRoot');root.innerHTML=`<div class="modal-backdrop"><section class="modal slot-picker"><p class="eyebrow">Blueprint Storage</p><h2>Store a blueprint</h2><p class="picker-hint">Blueprints live here until you craft them into an open Build slot.</p><input id="blueprintSearch" class="form-control picker-search" placeholder="Search droids…" autofocus><div id="blueprintResults" class="picker-results"></div><button class="btn ghost" id="cancelBlueprint">Cancel</button></section></div>`;const draw=()=>{const q=root.querySelector('#blueprintSearch').value.toLowerCase();root.querySelector('#blueprintResults').innerHTML=state.droids.filter(d=>d.name.toLowerCase().includes(q)).map(d=>`<button class="picker-droid" data-name="${d.name}"><span>${picture(d)}</span><b>${d.name}</b><small>${rarityText(d.rarity)} &middot; blueprint</small></button>`).join('')||'<p class="roster-empty">No matching droids.</p>';root.querySelectorAll('.picker-droid').forEach(b=>b.onclick=()=>showBlueprintVariantChoice(b.dataset.name,slot,onDone))};root.querySelector('#blueprintSearch').oninput=draw;root.querySelector('#cancelBlueprint').onclick=()=>root.innerHTML='';draw()}
function showBlueprintVariantChoice(name,slot,onDone){const root=document.querySelector('#modalRoot'),d=state.droids.find(x=>x.name===name);if(isIconic(d)){addBlueprint(name,'DEFAULT',slot);root.innerHTML='';onDone();return}root.innerHTML=`<div class="modal-backdrop"><section class="modal"><p class="eyebrow">Blueprint Storage</p><h2>Store ${name} blueprint</h2><div class="variant-choice">${[...VARIANTS,'SCOURGE'].map(v=>`<button data-variant="${v}">${picture(d,v)}<strong>${variantText(v)}</strong><small>Blueprint</small></button>`).join('')}</div><button class="btn ghost" id="backToBlueprintPicker">Back</button></section></div>`;root.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>{addBlueprint(name,b.dataset.variant,slot);root.innerHTML='';onDone()});root.querySelector('#backToBlueprintPicker').onclick=()=>showBlueprintPicker(slot,onDone)}
function baseExport(){return{app:'Droid Archives',version:5,exportedAt:new Date().toISOString(),base:{eventProgress:normaliseEventProgress(state.eventProgress),party:normaliseParty(state.party),owned:state.owned,blueprints:state.blueprints,droidex:state.droidex,novaUpgrades:state.novaUpgrades,novaIconicUnlocks:normaliseNovaIconicUnlocks(state.novaIconicUnlocks),missionSettings:normaliseMissionSettings(state.missionSettings),iconicTraits:state.iconicTraits,cantinaPurchases:state.cantinaPurchases,cantinaPackGrants:state.cantinaPackGrants,multiplier:state.multiplier,cycle:state.cycle,rebirth:state.rebirth,superRebirthGoal:state.superRebirthGoal,astromechIconicRoles:normaliseAstromechIconicRoles(state.astromechIconicRoles),fusionKeepRules:state.fusionKeepRules||[],fusionPreferences:normaliseFusionPreferences(state.fusionPreferences),notificationPreferences:normaliseNotificationPreferences(state.notificationPreferences),protocolPriority:state.protocolPriority,optimiseFreeBuild:state.optimiseFreeBuild,optimiseFuseFirst:state.optimiseFuseFirst!==false,optimiseIncludeIconics:Boolean(state.optimiseIncludeIconics),fusionAsLounge:Boolean(state.fusionAsLounge),optimiseFreeBuildMode:state.optimiseFreeBuildMode,optimiseMinGainPercent:state.optimiseMinGainPercent,optimiseKeepDroidex:state.optimiseKeepDroidex,optimiseKeepProtocol:state.optimiseKeepProtocol,companionGoals:state.companionGoals,preferredCompanions:state.preferredCompanions,autoCompleteBuilds:state.autoCompleteBuilds,autoPurchaseSlots:state.autoPurchaseSlots,purchasedSlots:state.purchasedSlots,loungePurchased:state.loungePurchased,novaLevel:state.novaLevel,rebirthTracker:state.rebirthTracker}}}
function droidexExport(){return{app:'Droid Archives',version:3,exportedAt:new Date().toISOString(),droidex:state.droidex}}
function validateDroidexImport(value){const rows=normalizeDroidRows(value?.droidex??value?.base?.droidex??value);if(!Array.isArray(rows))throw Error('This file does not contain a valid Droidex.');const validNames=new Set(state.droids.map(d=>d.name)),flawlessNames=new Set(rows.filter(x=>x?.flawless).map(x=>x.name)),entries=new Map();for(const row of rows){const d=state.droids.find(x=>x.name===row?.name);if(!validNames.has(row?.name)||!OWNED_VARIANTS.includes(row?.variant)||isIconic(d)&&row.variant!=='DEFAULT')throw Error(`Invalid Droidex entry: ${row?.name||'unknown'}.`);entries.set(`${row.name}:${row.variant}`,{name:row.name,variant:row.variant,flawless:!isIconic(d)&&flawlessNames.has(row.name)})}return[...entries.values()]}
function showDroidexTransferModal(onDone){const root=document.querySelector('#modalRoot'),json=JSON.stringify(droidexExport(),null,2);root.innerHTML=`<div class="modal-backdrop"><section class="modal transfer-modal" role="dialog" aria-modal="true"><p class="eyebrow">Collection save</p><h2>Droidex Import / Export</h2><p class="picker-hint">Download your collected variants and flawless progress, or replace them from a Droidex or full Base export.</p><textarea id="droidexTransferJson" class="form-control transfer-json" spellcheck="false">${json}</textarea><label class="file-picker">Choose import file<input id="droidexImportFile" type="file" accept="application/json,.json"></label><p id="droidexTransferError" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn" id="downloadDroidex">Download Droidex</button><button class="btn secondary" id="importDroidex">Import Droidex</button><button class="btn ghost" id="cancelDroidexTransfer">Close</button></div></section></div>`;const textarea=root.querySelector('#droidexTransferJson'),error=root.querySelector('#droidexTransferError');root.querySelector('#droidexImportFile').onchange=async e=>{const file=e.target.files[0];if(file)textarea.value=await file.text()};root.querySelector('#downloadDroidex').onclick=()=>{const blob=new Blob([JSON.stringify(droidexExport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`droid-archives-droidex-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Droidex exported')};root.querySelector('#importDroidex').onclick=()=>{try{state.droidex=validateDroidexImport(JSON.parse(textarea.value));save();root.innerHTML='';toast('Droidex imported');onDone()}catch(e){error.textContent=e instanceof SyntaxError?'The import is not valid JSON.':e.message}};root.querySelector('#cancelDroidexTransfer').onclick=()=>root.innerHTML=''}
function validateBaseImport(value){const data=value?.base??value;if(!data||!Array.isArray(data.owned))throw Error('This file does not contain a valid Base.');data.owned=normalizeDroidRows(data.owned);data.droidex=normalizeDroidRows(data.droidex);data.blueprints=normalizeDroidRows(data.blueprints);const validNames=new Set(state.droids.map(d=>d.name));for(const row of data.owned){if(!validNames.has(row.name)||!OWNED_VARIANTS.includes(row.variant)||!Number.isFinite(Number(row.qty))||Number(row.qty)<1)throw Error(`Invalid droid entry: ${row?.name||'unknown'}.`)}const droidex=Array.isArray(data.droidex)?data.droidex.filter(x=>validNames.has(x.name)&&OWNED_VARIANTS.includes(x.variant)).map(x=>({name:x.name,variant:x.variant,flawless:Boolean(x.flawless)})):[],blueprints=Array.isArray(data.blueprints)?data.blueprints.filter(x=>validNames.has(x.name)&&OWNED_VARIANTS.includes(x.variant)).map((x,i)=>({name:x.name,variant:baseVariant(x.variant),...(Number.isInteger(Number(x.slot))?{slot:Number(x.slot)}:{slot:i})})):[],upgradeIds=new Set((state.novaShop?.upgrades||[]).map(x=>x.id)),novaUpgrades={};for(const [id,level] of Object.entries(data.novaUpgrades||{}))if(!upgradeIds.size||upgradeIds.has(id))novaUpgrades[id]=Math.max(0,Math.floor(Number(level)||0));const cantinaPurchases=Object.fromEntries(Object.entries(data.cantinaPurchases||{}).filter(([,owned])=>Boolean(owned)).map(([id])=>[id,true]));return{eventProgress:normaliseEventProgress(data.eventProgress),party:normaliseParty(data.party),owned:data.owned.map(x=>({name:x.name,variant:x.variant,qty:Math.floor(Number(x.qty)),...(SLOT_RULES[x.preferred]?{preferred:x.preferred,...(Number.isInteger(Number(x.preferredSlot))?{preferredSlot:Number(x.preferredSlot)}:{})}:{}),...(x.lockedSlot||x.lockedCompanion?{lockedSlot:true}:{}),...(x.built?{built:true}:{}),...(normaliseTrait(x.trait,state.droids.find(d=>d.name===x.name))?{trait:normaliseTrait(x.trait,state.droids.find(d=>d.name===x.name))}:{})})),blueprints,droidex,novaUpgrades,novaIconicUnlocks:normaliseNovaIconicUnlocks(data.novaIconicUnlocks),missionSettings:normaliseMissionSettings(data.missionSettings),iconicTraits:normaliseIconicTraits(data.iconicTraits,state.droids),cantinaPurchases,cantinaPackGrants:Object.fromEntries(Object.entries(data.cantinaPackGrants||{}).filter(([,applied])=>applied===true).map(([id])=>[id,true])),multiplier:Number.isFinite(Number(data.multiplier))?Math.max(1,Number(data.multiplier)):1,cycle:Object.hasOwn(state.rebirths,String(Number(data.cycle)))?Number(data.cycle):0,rebirth:Math.max(0,Math.min(Math.max(maxRebirth(),40),Math.floor(Number(data.rebirth)||0))),superRebirthGoal:Math.max(12,Math.min(Math.max(maxRebirth(),40),Math.floor(Number(data.superRebirthGoal)||maxRebirth()))),astromechIconicRoles:normaliseAstromechIconicRoles(data.astromechIconicRoles),fusionKeepRules:normaliseFusionKeepRules(data.fusionKeepRules),fusionPreferences:normaliseFusionPreferences(data.fusionPreferences),notificationPreferences:normaliseNotificationPreferences(data.notificationPreferences),protocolPriority:data.protocolPriority==='crafting'?'crafting':'credits',optimiseFreeBuild:Boolean(data.optimiseFreeBuild),optimiseFuseFirst:data.optimiseFuseFirst!==false,optimiseIncludeIconics:Boolean(data.optimiseIncludeIconics),fusionAsLounge:Boolean(data.fusionAsLounge),showRegionalProduction:data.showRegionalProduction!==false,optimiseFreeBuildMode:['upgrade-cost','rarity-income'].includes(data.optimiseFreeBuildMode)?data.optimiseFreeBuildMode:'upgrade-cost',optimiseKeepDroidex:data.optimiseKeepDroidex!==false,optimiseKeepProtocol:data.optimiseKeepProtocol!==false,companionGoals:Array.isArray(data.companionGoals)?data.companionGoals:null,preferredCompanions:Array.isArray(data.preferredCompanions)?data.preferredCompanions:[],autoCompleteBuilds:Boolean(data.autoCompleteBuilds),loungePurchased:Math.max(0,Math.min(12,Math.floor(Number(data.loungePurchased)||0))),novaLevel:Math.max(0,Math.min(4,Math.floor(Number(data.novaLevel)||0)))}}
const validateBaseImportWithoutUnusedMode=validateBaseImport;
validateBaseImport=value=>{const result=validateBaseImportWithoutUnusedMode(value),data=value?.base??value;if(OPTIMISE_FREE_BUILD_MODES.includes(data?.optimiseFreeBuildMode))result.optimiseFreeBuildMode=data.optimiseFreeBuildMode;const validSlotKeys=new Set(eligibleRebirthSlots(maxRebirth()).map(x=>slotPurchaseKey(x.type,x.index)));result.autoPurchaseSlots=data?.autoPurchaseSlots===undefined?true:Boolean(data.autoPurchaseSlots);result.purchasedSlots=[...new Set(Array.isArray(data?.purchasedSlots)?data.purchasedSlots.filter(key=>validSlotKeys.has(key)):[])];result.rebirthTracker=normalizeRebirthTracker(data?.rebirthTracker);state.rebirthTracker=result.rebirthTracker;return result};
function showTransferModal(onDone){const root=document.querySelector('#modalRoot'),json=JSON.stringify(baseExport(),null,2);root.innerHTML=`<div class="modal-backdrop"><section class="modal transfer-modal" role="dialog" aria-modal="true"><p class="eyebrow">Base save</p><h2>Import / Export</h2><p class="picker-hint">Download this Base and Droidex as a JSON file, or replace them by selecting or pasting another save.</p><textarea id="transferJson" class="form-control transfer-json" spellcheck="false">${json}</textarea><label class="file-picker">Choose import file<input id="importFile" type="file" accept="application/json,.json"></label><p id="transferError" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn" id="downloadExport">Download export</button><button class="btn secondary" id="importSave">Import save</button><button class="btn ghost" id="cancelTransfer">Close</button></div></section></div>`;const textarea=root.querySelector('#transferJson'),error=root.querySelector('#transferError');root.querySelector('#importFile').onchange=async e=>{const file=e.target.files[0];if(file)textarea.value=await file.text()};root.querySelector('#downloadExport').onclick=()=>{const blob=new Blob([JSON.stringify(baseExport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`droid-archives-base-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Base exported')};root.querySelector('#importSave').onclick=()=>{try{const next=validateBaseImport(JSON.parse(textarea.value));state.eventProgress=normaliseEventProgress(next.eventProgress);state.party=normaliseParty(next.party);state.owned=next.owned;state.blueprints=next.blueprints;state.droidex=next.droidex;state.novaUpgrades=next.novaUpgrades;state.novaIconicUnlocks=next.novaIconicUnlocks;state.missionSettings=normaliseMissionSettings(next.missionSettings);state.iconicTraits=next.iconicTraits;state.cantinaPurchases=next.cantinaPurchases;state.cantinaPackGrants=next.cantinaPackGrants;state.multiplier=next.multiplier;state.cycle=next.cycle;state.rebirth=next.rebirth;state.superRebirthGoal=next.superRebirthGoal;state.astromechIconicRoles=next.astromechIconicRoles;state.fusionKeepRules=next.fusionKeepRules||[];state.fusionPreferences=normaliseFusionPreferences(next.fusionPreferences);state.notificationPreferences=normaliseNotificationPreferences(next.notificationPreferences);state.protocolPriority=next.protocolPriority;state.optimiseFreeBuild=next.optimiseFreeBuild;state.optimiseFuseFirst=next.optimiseFuseFirst;state.optimiseIncludeIconics=next.optimiseIncludeIconics;state.fusionAsLounge=next.fusionAsLounge;state.showRegionalProduction=next.showRegionalProduction;state.optimiseFreeBuildMode=next.optimiseFreeBuildMode;state.optimiseMinGainPercent=Number.isFinite(Number(next.optimiseMinGainPercent))?Number(next.optimiseMinGainPercent):0.5;state.optimiseKeepDroidex=next.optimiseKeepDroidex!==false;state.optimiseKeepProtocol=next.optimiseKeepProtocol!==false;state.companionGoals=Array.isArray(next.companionGoals)?next.companionGoals:null;state.preferredCompanions=Array.isArray(next.preferredCompanions)?next.preferredCompanions:[];state.autoCompleteBuilds=Boolean(next.autoCompleteBuilds);state.autoPurchaseSlots=next.autoPurchaseSlots;state.purchasedSlots=next.purchasedSlots;state.loungePurchased=next.loungePurchased;state.novaLevel=next.novaLevel;syncCantinaPackUpgrades();autoPurchaseEligibleSlots();save();root.innerHTML='';toast('Base imported');onDone()}catch(e){error.textContent=e instanceof SyntaxError?'The import is not valid JSON.':e.message}};root.querySelector('#cancelTransfer').onclick=()=>root.innerHTML=''}
const productiveStations=()=>['WORKER','ASTROMECH','BATTLE'].flatMap(station=>stationSlotIndices(station).map(slot=>({station,slot})));
function stabiliseAssignments(assignments,p){const current=new Map(p.placed.map(x=>[`${x.source}:${x.unit}`,x])),reserved=new Set(p.placed.filter(x=>x.lockedSlot).map(x=>`${x.station}:${x.slot}`)),byStation=new Map();for(const assignment of assignments){if(!byStation.has(assignment.station))byStation.set(assignment.station,[]);byStation.get(assignment.station).push(assignment)}return[...byStation].flatMap(([station,list])=>{const slots=stationSlotIndices(station).filter(slot=>!reserved.has(`${station}:${slot}`)),used=new Set(),kept=[],floating=[];for(const assignment of list){const old=current.get(assignment.key);if(old?.station===station&&slots.includes(old.slot)&&!used.has(old.slot)){used.add(old.slot);kept.push({...assignment,slot:old.slot})}else floating.push(assignment)}const open=slots.filter(slot=>!used.has(slot));return[...kept,...floating.map((assignment,index)=>({...assignment,slot:open[index]??assignment.slot}))]})}
function scrapIncomeForPlaced(placed){return incomeForPlaced(placed)}
function slotProductionHtml(d,variant,station,baseIncome,placed=[],slot=0){
  if(['BUILD','FUSION_BUILD'].includes(station)){const estimate=estimateCraft(d,variant,station,slot,placed);const unit=placed.find(x=>x.station===station&&x.slot===slot);return `<span>${variantText(variant)}</span><span class="adjusted-production">${unit?.built?'Build complete':estimate?`${craftTimeText(estimate.seconds)} passive full build`:'Craft time unavailable'}</span><span class="production-breakdown">${estimate?craftBreakdown(estimate,station):''}</span>`;}
  if(isProtocolStation(station))return protocolProductionHtml(d,variant,station,placed);
  const earns=PRODUCTIVE_STATIONS.includes(station),incomeKnown=knownNumber(d.variants[variant]?.income),baseRate=incomeKnown?Number(d.variants[variant].income):0;
  if(station==='UPGRADE_CHIP'){const rate=upgradeChipRate(d,variant),stored=rate*60,bb8=bb8CompanionActive(placed),claimMultiplier=(bb8?2:1)*(1+traitSum(placed,6))*partyBonuses(state.party).chips;return rate?`<span>${variantText(variant)} · Base ${fmt(rate)} chips/min</span><span class="adjusted-production">On collection ${fmt(rate*claimMultiplier)} chips/min</span><span class="production-breakdown">Stores up to ${fmt(stored)} chips (1 hour) · ${fmt(stored*claimMultiplier)} when claimed${bb8?' with BB-8':''} &middot; &times;${partyBonuses(state.party).chips.toFixed(1)} party</span>`:`<span>${variantText(variant)}</span><span class="adjusted-production">No Upgrade Chip rate</span><span class="production-breakdown">Use a Common, Rare, Epic, Legendary or Mythic droid</span>`}
  if(station==='COMPANION'&&d.name==='BB-8'){const chipUnit=placed.find(x=>x.station==='UPGRADE_CHIP'),chipDroid=chipUnit&&state.droids.find(x=>x.name===chipUnit.name),rate=chipUnit?upgradeChipRate(chipDroid,chipUnit.variant):0;return `<span>${variantText(variant)} · Companion effect</span><span class="adjusted-production">Doubles Upgrade Chips when claimed</span><span class="production-breakdown">${rate?`Current one-hour claim: ${fmt(rate*60*partyBonuses(state.party).chips)} → ${fmt(rate*120*partyBonuses(state.party).chips)} chips (including party bonus)`:'Place a rated droid in the Upgrade Chip slot to use this bonus'}</span>`}
  if(isIconic(d)){const rate=iconicIncome(d),baseContribution=Math.max(baseRate,baseIncome*rate),adjustedContribution=droidRate(d,variant,station,baseIncome)*protocolRegionMultiplier(placed,station),label=`${variantText(variant)} · Base ${fmt(baseContribution)} (${rate*100}%)/s`;return earns?`<span>${label}</span><span class="adjusted-production">Adjusted ${fmt(adjustedContribution)}/s</span><span class="production-breakdown">×${effectiveMultiplier().toFixed(2)} base multiplier</span>`:`<span>${label}</span><span class="adjusted-production">Would earn ${fmt(adjustedContribution)}/s</span><span class="production-breakdown">No contribution here</span>`}
  if(!incomeKnown)return `<span>${variantText(variant)} · Base income unknown</span><span class="adjusted-production">Production not yet known</span><span class="production-breakdown">Excluded from credit totals until its income is confirmed</span>`;
  const match=earns&&station===d.type,adjustment=match?1.1:1,hive=earns&&placedHive(placed,state.droids).eligible(placed.find(x=>x.station===station&&x.slot===slot))?baseRate*(1+traitAmount(placed.find(x=>x.station===station&&x.slot===slot),0))*placedHive(placed,state.droids).bonusFor(placed.find(x=>x.station===station&&x.slot===slot)):0,adjustedRate=hive+baseRate*(1+traitAmount(placed.find(x=>x.station===station&&x.slot===slot),0))*effectiveMultiplier()*adjustment*protocolRegionMultiplier(placed,station),potentialRate=baseRate*effectiveMultiplier();
  return earns?`<span>${variantText(variant)} · Base ${fmt(baseRate)}/s</span><span class="adjusted-production">Adjusted ${fmt(adjustedRate)}/s</span>${hive?`<span class="production-breakdown">Includes ${fmt(hive)}/s Hive Mind</span>`:''}<span class="production-breakdown">×${effectiveMultiplier().toFixed(2)} base multiplier${match?` · ×${adjustment.toFixed(2)} station match`:''}${protocolRegionMultiplier(placed,station)>1?` · ×${protocolRegionMultiplier(placed,station).toFixed(2)} Protocol`:''}</span>`:`<span>${variantText(variant)} · Base ${fmt(baseRate)}/s</span><span class="adjusted-production">Would earn ${fmt(potentialRate)}/s</span><span class="production-breakdown">No contribution here</span>`
}
function optimiseAssignmentMoves(assignments,p){const current=new Map(p.placed.map(x=>[`${x.source}:${x.unit}`,x])),wanted=new Map(assignments.map(x=>[x.key,x])),firstOpen=(station,origin)=>slotFillOrder(station,origin).find(i=>!p.placed.some(x=>x.station===station&&x.slot===i))??-1;return assignments.filter(x=>current.get(x.key)?.station!==x.station).map(x=>{const old=current.get(x.key),sourceLabel=old?old.station:'Roster',displaced=p.placed.find(y=>y.station===x.station&&`${y.source}:${y.unit}`!==x.key&&wanted.get(`${y.source}:${y.unit}`)?.station!==x.station),open=firstOpen(x.station,old),targetSlot=displaced?displaced.slot:open>=0?open:x.slot,targetLabel=displaced?`${x.station} slot holding ${displaced.name} ${variantText(displaced.variant)}`:`empty ${x.station} slot`;return{unit:{...x,slot:targetSlot},current:sourceLabel,targetStation:x.station,targetSlot,targetLabel,displaced:displaced?{key:`${displaced.source}:${displaced.unit}`,name:displaced.name,variant:displaced.variant,target:sourceLabel}:null}});}
// How much a single station change has to earn before Optimise asks for it.
// Walking a droid to another room for a fraction of a percent is not worth
// the trip, so the layout search treats staying put as worth this much.
const optimiseMinGainPercent=()=>{const value=Number(state.optimiseMinGainPercent);return Number.isFinite(value)&&value>=0?Math.min(20,value):0.5};
const optimiseMoveLambda=currentIncome=>Math.max(0,currentIncome||0)*optimiseMinGainPercent()/100;
function optimiseCreditBase(p,currentIncome){
  const lambda=optimiseMoveLambda(currentIncome);
  // A droid still being built cannot be picked up, so it is pinned exactly like
  // a locked one and never offered a productive slot.
  const locked=p.placed.filter(x=>x.lockedSlot||isBuilding(x)),lockedKeys=new Set(locked.map(x=>`${x.source}:${x.unit}`)),lockedSlots=new Set(locked.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)).map(x=>`${x.station}:${x.slot}`)),slots=productiveStations().filter(slot=>!lockedSlots.has(`${slot.station}:${slot.slot}`)),currentPosition=new Map(p.placed.map(x=>[`${x.source}:${x.unit}`,x])),units=expandedOwned().map(x=>({...x,key:`${x.source}:${x.unit}`,droid:state.droids.find(d=>d.name===x.name)})).filter(x=>x.droid&&!lockedKeys.has(x.key)),iconics=units.filter(x=>iconicIncome(x.droid)>0).sort((a,b)=>iconicIncome(b.droid)-iconicIncome(a.droid)),regular=units.filter(x=>!iconicIncome(x.droid)),lockedProductive=locked.map(x=>({...x,droid:state.droids.find(d=>d.name===x.name)})).filter(x=>x.droid&&PRODUCTIVE_STATIONS.includes(x.station)),lockedIconicRate=[...new Set(lockedProductive.filter(x=>iconicIncome(x.droid)>0).map(x=>x.name))].reduce((sum,name)=>sum+iconicIncome(state.droids.find(d=>d.name===name)),0),lockedRegular=lockedProductive.filter(x=>!iconicIncome(x.droid));
  let best={income:0,assignments:[]};
  // An Iconic earns its share wherever it works, so with the Iconics sorted by
  // share the only subsets worth trying are the strongest k of them: swapping a
  // weaker one in for a stronger one costs the same slot for less income.
  for(let count=0;count<=iconics.length;count++){
    const usedUnits=new Set(),usedSlots=new Set(),assignments=[],selected=iconics.slice(0,count);
    let valid=true;
    for(const icon of selected){
      // An Iconic earns the same share wherever it works, so it stays where it
      // is when it can, then takes its own type's room, then anywhere with space.
      const prefer=[currentPosition.get(icon.key)?.station,icon.droid.type,...PRODUCTIVE_STATIONS].filter(Boolean);
      const open=prefer.map(station=>slots.find(slot=>slot.station===station&&!usedSlots.has(`${slot.station}:${slot.slot}`))).find(Boolean);
      if(!open){valid=false;break}
      usedUnits.add(icon.key);usedSlots.add(`${open.station}:${open.slot}`);assignments.push({key:icon.key,name:icon.name,variant:icon.variant,station:open.station,slot:open.slot,value:0,iconic:true})
    }
    if(!valid)continue;
    const iconicRate=lockedIconicRate+assignments.reduce((sum,x)=>sum+iconicIncome(state.droids.find(d=>d.name===x.name)),0),lockedIncome=lockedRegular.reduce((sum,unit)=>{const base=unit.droid.variants[unit.variant]?.income||0;return sum+base*((unit.droid.type===unit.station?1.1:1)+iconicRate)*effectiveMultiplier()},0),stations=['WORKER','ASTROMECH','BATTLE'],available=Object.fromEntries(stations.map(station=>[station,slots.filter(slot=>slot.station===station&&!usedSlots.has(`${slot.station}:${slot.slot}`))])),caps=Object.fromEntries(stations.map(station=>[station,available[station].length])),keyFor=counts=>`${counts.WORKER},${counts.ASTROMECH},${counts.BATTLE}`;
    // Staying put is worth the move threshold: a droid only changes station when
    // the layout earns at least that much more for it. Ties still prefer its
    // own type of room.
    const tieScore=(unit,station)=>{const old=currentPosition.get(unit.key);return(old?.station===station?10000:0)+(unit.droid.type===station?1000:0)+(old&&['WORKER','ASTROMECH','BATTLE'].includes(old.station)&&station!==old.station?-10:0)};
    const stayBonus=(unit,station)=>currentPosition.get(unit.key)?.station===station?lambda:0;
    let dp=new Map([[keyFor({WORKER:0,ASTROMECH:0,BATTLE:0}),{value:0,stay:0,stability:0,counts:{WORKER:0,ASTROMECH:0,BATTLE:0},picks:[]}]]);
    for(const unit of regular.filter(unit=>!usedUnits.has(unit.key))){
      const next=new Map(dp);
      for(const state of dp.values()){
        for(const station of stations){
          if(state.counts[station]>=caps[station])continue;
          const base=unit.droid.variants[unit.variant]?.income||0,value=base*((unit.droid.type===station?1.1:1)+iconicRate)*effectiveMultiplier(),counts={...state.counts,[station]:state.counts[station]+1},key=keyFor(counts),candidate={value:state.value+value,stay:state.stay+stayBonus(unit,station),stability:state.stability+tieScore(unit,station),counts,picks:[...state.picks,{unit,station,value}]},previous=next.get(key);
          if(!previous||candidate.value+candidate.stay>previous.value+previous.stay+1e-6||Math.abs(candidate.value+candidate.stay-previous.value-previous.stay)<=1e-6&&candidate.stability>previous.stability)next.set(key,candidate)
        }
      }
      dp=next
    }
    const chosen=[...dp.values()].sort((a,b)=>(b.value+b.stay-a.value-a.stay)||(b.stability-a.stability))[0],stationUse={WORKER:0,ASTROMECH:0,BATTLE:0};
    for(const pick of chosen.picks){const slot=available[pick.station][stationUse[pick.station]++],slotKey=`${slot.station}:${slot.slot}`;usedUnits.add(pick.unit.key);usedSlots.add(slotKey);assignments.push({key:pick.unit.key,name:pick.unit.name,variant:pick.unit.variant,station:slot.station,slot:slot.slot,value:pick.value})}
    const income=lockedIncome+assignments.reduce((sum,x)=>sum+x.value,0);
    const stay=assignments.reduce((sum,x)=>sum+(currentPosition.get(x.key)?.station===x.station?lambda:0),0);
    const stability=chosen.stability+assignments.reduce((sum,x)=>{const old=currentPosition.get(x.key);return sum+(old?.station===x.station?10000:0)+(old?.station===x.station&&old?.slot===x.slot?1000:0)},0);
    if(income+stay>best.income+(best.stay||0)+1e-6||Math.abs(income+stay-best.income-(best.stay||0))<=1e-6&&stability>(best.stability||0))best={income,stay,stability,assignments}
  }
  best.assignments=stabiliseAssignments(best.assignments,p);
  const moves=optimiseAssignmentMoves(best.assignments,p);
  const gain=Math.max(0,best.income-currentIncome),actionable=gain>1&&moves.length;
  return{income:best.income,gain:actionable?gain:0,moves:actionable?moves:[],assignments:best.assignments}
}
function optimisePanel(plan){const open=localStorage.getItem('droid-archive-optimise-open')==='1',moves=plan.moves.slice(0,8).map((move,i)=>`<li><button class="optimise-apply" data-optimise-move="${i}" title="Apply this move">✓</button><strong>${move.unit.name}</strong> <span>${variantText(move.unit.variant)}</span><small>Move ${move.current} ${move.unit.name} ${variantText(move.unit.variant)} to ${move.targetLabel}</small>${move.displaced?`<em>This swaps out ${move.displaced.name} ${variantText(move.displaced.variant)}; it should move to ${move.displaced.target}.</em>`:'<em>No occupied slot needs clearing.</em>'}</li>`).join('');return `<section class="optimise-panel ${open?'open':'closed'}"><header><div><p class="eyebrow">Credit optimiser</p><h2>Optimise placements</h2></div><div class="optimise-summary"><strong>${plan.gain>1?`+${fmt(plan.gain*3600)}/h`:'Already optimised'}</strong><button class="btn secondary" id="toggleOptimise">${open?'Hide':'Show'} plan</button></div></header><div class="optimise-body" ${open?'':'hidden'}><p>${plan.gain>1?`Best estimated layout: ${fmt(plan.income*3600)} credits/hour. Put each droid into the named slot; use ✓ to apply a move.`:'Your productive slots already look best for credit/hour with the droids you own.'}</p>${moves?`<ul>${moves}</ul>`:''}</div></section>`}
// The per-rebirth list below repeats a droid once for every rebirth that wants
// it, which is right when planning one rebirth and wrong when you are staring at
// a full Base asking what is still outstanding and what can go. This is the same
// data folded the other way: one line per droid, at the highest quality it is
// ever asked for, plus the copies nothing needs any more.
function outstandingDroidsHtml(p){
  const goal=rebirthGoal(),outstanding=[...new Set(futureRequirements().map(x=>x.droidName))].map(name=>{
    const schedule=requirementSchedule(name,{after:state.rebirth,through:goal}),d=state.droids.find(x=>x.name===name);
    const peak=schedule.reduce((best,item)=>variantRank(item.variant)>variantRank(best)?item.variant:best,schedule[0]?.variant);
    const have=bestOwnedVariant(name),ready=rebirthVariantReady(have,peak);
    return{d,name,peak,have,ready,chips:d&&have&&!ready?chipsToVariant(d,have,peak):0,at:schedule.map(x=>x.at)};
  }).filter(row=>row.d&&!row.ready).sort((a,b)=>a.at[0]-b.at[0]||a.name.localeCompare(b.name));
  // A copy is spare when no rebirth left in this cycle names its droid. Iconics
  // and anything flagged cannotSell are left out because they cannot be sold.
  const spare=[];
  for(const unit of [...(p?.placed||[]),...(p?.overflow||[])]){
    const d=state.droids.find(x=>x.name===unit.name);
    if(!d||isIconic(d)||d.special?.cannotSell)continue;
    if(requirementSchedule(unit.name,{after:state.rebirth,through:goal}).length)continue;
    if(spare.some(x=>x.d.name===d.name&&x.unit.variant===unit.variant))continue;
    spare.push({d,unit,chips:chipSellValue(d,unit.variant)});
  }
  spare.sort((a,b)=>b.chips-a.chips);
  const open=localStorage.getItem('droid-archive-outstanding-open')!=='0';
  const findRow=row=>`<a class="outstanding-card ${row.have?'upgrade':'missing'}" href="#/droid/${slug(row.name)}">${picture(row.d,row.peak)}<span><strong>${row.name}</strong><small>${rarityText(row.d.rarity)} &middot; needs ${requirementVariantText(row.peak)}</small><em>R: ${[...new Set(row.at)].join(', ')}${row.have?` &middot; have ${variantText(row.have)} &middot; ${rebirthActionText(row.d,row.have,row.peak,row.chips)}`:''}</em></span></a>`;
  const spareRow=row=>`<a class="outstanding-card spare" href="#/droid/${slug(row.d.name)}">${picture(row.d,row.unit.variant)}<span><strong>${row.d.name}</strong><small>${variantText(row.unit.variant)} &middot; ${stationSlotLabel(row.unit.station,row.unit.slot)}</small><em>Sells for ${fmt(row.chips)} chips</em></span></a>`;
  return `<details class="outstanding-panel" id="outstandingPanel" ${open?'open':''}><summary><span><strong>What is still left</strong><small>${outstanding.length} droid${outstanding.length===1?'':'s'} to find through R: ${goal}${spare.length?` &middot; ${spare.length} in your Base nothing needs`:''}</small></span></summary><div class="outstanding-body"><input id="outstandingSearch" class="form-control" aria-label="Search What is still left" placeholder="Search this panel..."><p id="outstandingEmpty" class="empty" hidden>No droids in this panel match your search.</p><section><h4>Only these are still needed</h4><div class="outstanding-grid">${outstanding.map(findRow).join('')||'<p class="empty">Nothing is outstanding through your goal.</p>'}</div></section><section><h4>Nothing left in this cycle needs these</h4><div class="outstanding-grid">${spare.map(spareRow).join('')||'<p class="empty">Every droid in your Base is still spoken for.</p>'}</div></section></div></details>`;
}
// The Base settings box holds the rebirth controls and sits at the very top of a
// page people keep scrolled to the bottom. Once it has scrolled past, a compact
// bar takes over so a rebirth can be stepped without the round trip up and back.
function attachRebirthQuickBar(rerender){
  // A Base re-render calls this again; the previous bar has to take its
  // observer with it rather than leaving one watching a detached node.
  document.querySelector('#rebirthQuickBar')?.dispose?.();
  // A read-only share has nothing to step; one you may edit changes its rebirth
  // from the settings box, so the bar belongs there too.
  if(state.sharedView&&!state.sharedView.canEdit)return;
  const anchor=document.querySelector('.modern-base-settings')||document.querySelector('.base-top');
  if(!anchor||typeof IntersectionObserver!=='function')return;
  const bar=document.createElement('div');
  bar.id='rebirthQuickBar';bar.className='rebirth-quick-bar';bar.hidden=true;
  const step=delta=>{
    const next=Math.min(maxRebirth(),Math.max(0,state.rebirth+delta));
    if(next===state.rebirth)return;
    // Same path as the settings box, so newly eligible slots are auto purchased.
    changeCurrentRebirth(next,rerender);
  };
  const draw=()=>{
    const goal=rebirthGoal(),next=(state.rebirths[state.cycle]||[]).find(r=>r.to===state.rebirth+1);
    bar.innerHTML=`<span class="quick-eyebrow">Cycle ${state.cycle+1}</span><div class="quick-step"><button type="button" data-quick-step="-1" ${state.rebirth<=0?'disabled':''} title="Down one rebirth" aria-label="Down one rebirth">&#9660;</button><b>R: ${state.rebirth}</b><button type="button" data-quick-step="1" ${state.rebirth>=maxRebirth()?'disabled':''} title="Up one rebirth" aria-label="Up one rebirth">&#9650;</button></div><span class="quick-goal">Goal R: ${goal}</span>${next?`<span class="quick-next">Next ${rebirthReadiness(next)?'<b class="ready">&#10003; ready</b>':'<b>not ready</b>'}</span>`:''}<button type="button" class="quick-top" id="rebirthQuickTop" title="Back to Base settings" aria-label="Back to Base settings">&#8593; Top</button>`;
    bar.querySelectorAll('[data-quick-step]').forEach(button=>button.onclick=()=>step(Number(button.dataset.quickStep)));
    bar.querySelector('#rebirthQuickTop').onclick=()=>anchor.scrollIntoView({behavior:'smooth',block:'start'});
  };
  draw();document.body.appendChild(bar);document.body.classList.add('has-rebirth-quick-bar');
  // Only show it once the settings box has gone past the top, never when the
  // page is simply scrolled above it.
  const observer=new IntersectionObserver(([entry])=>{
    bar.hidden=entry.isIntersecting||entry.boundingClientRect.bottom>0;
  },{threshold:0});
  observer.observe(anchor);
  // A rerender throws this bar away, so the observer has to go with it.
  bar.dispose=()=>{observer.disconnect();bar.remove();document.body.classList.remove('has-rebirth-quick-bar')};
}
function mapRebirthUsesHtml(unit){
  const d=state.droids.find(d=>d.name===unit.name);if(!d)return '';
  const uses=(state.rebirths[state.cycle]||[]).flatMap(r=>(r.requiredDroids||[]).filter(req=>req.droidName===d.name).map(req=>({at:r.to,variant:req.variant}))).sort((a,b)=>a.at-b.at);
  const upcoming=uses.filter(r=>r.at>state.rebirth),completed=uses.filter(r=>r.at<=state.rebirth);
  const unfinished=unit.blueprint?'Craft this blueprint first.':isBuilding(unit)?'Finish building this droid first.':'';
  const row=(req,past=false)=>{
    const ready=rebirthVariantReady(unit.variant,req.variant),chips=chipsToVariant(d,unit.variant,req.variant);
    const action=past?'Completed rebirth':ready?(unfinished?'Variant ready':'Ready for this requirement'):rebirthActionText(d,unit.variant,req.variant,chips);
    const badge=past?'Completed':req.at===state.rebirth+1?'Next rebirth':req.at>rebirthGoal()?'After your goal':'Upcoming';
    return `<li class="tm-rebirth-use ${past?'tm-rebirth-past':ready&&!unfinished?'tm-rebirth-ready':'tm-rebirth-upgrade'}"><div><strong>Rebirth ${req.at}</strong><small>${badge}</small></div><span>Needs ${requirementVariantText(req.variant)}</span><p>${action}</p></li>`;
  };
  return `<section class="tm-rebirth-uses" aria-label="Rebirth uses"><h3>Rebirth uses</h3><p>Cycle ${Number(state.cycle)+1} &middot; currently R: ${state.rebirth}</p>${unfinished?`<p class="tm-rebirth-build">${unfinished} ${unit.blueprint?'A stored blueprint does not count as an owned droid.':'Unfinished droids are not ready for Rebirth.'}</p>`:''}${upcoming.length?`<ul>${upcoming.map(req=>row(req)).join('')}</ul><p class="tm-rebirth-cost-note">Upgrade costs start from this copy's ${variantLabel(unit.variant)} variant. Each row is a separate target; do not add the costs together.</p>`:`<p>${uses.length?'No remaining rebirth uses':'Not required for any rebirth'} in this cycle.</p>`}${completed.length?`<details><summary>Completed rebirth uses (${completed.length})</summary><ul>${completed.map(req=>row(req,true)).join('')}</ul></details>`:''}<a href="#/droid/${slug(d.name)}">Open droid page</a></section>`;
}
// Keep map selection and view controls through same-profile cloud refreshes.
// This is temporary UI state only; a different Base starts with no selection.
let baseMapViewState={profileKey:null,ui:{}};
function missionToolsContext(placed){return {placed,droids:state.droids,settings:state.missionSettings,creditsPerSecond:incomeForPlaced(placed)-passiveTraitIncome(placed),craft:(d,v,slot)=>estimateCraft(d,v,'BUILD',slot,placed),baseChips:baseChipSellValue,saleMultiplier:chipSellBonusMultiplier(),onSave:value=>{if(state.sharedView&&!state.sharedView.canEdit)return;state.missionSettings=normaliseMissionSettings(value);save();}};}
function baseTraitSummary(placed){
  const units=placed.filter(u=>normaliseTrait(u.trait));if(!units.length)return '<p class="trait-base-hint">Record traits using the Trait button on a droid card or in map details. <a href="#/traits">Browse traits</a>.</p>';
  return `<details class="trait-guide"><summary>Recorded traits and active bonuses (${units.length})</summary><p>Trait bonuses follow the droid when it moves. Traits add ${fmt(traitSum(placed,2))} maximum health, ${(traitSum(placed,4)*100).toFixed(0)} percentage points of critical chance and ${(traitSum(placed,5)*100).toFixed(0)} percentage points of critical amount. Fusion pickaxe trait multiplier: ${(1+traitSum(placed,8)).toFixed(2)}x; offline speed bonus: +${(traitSum(placed,10)*100).toFixed(0)}%. Your entered credit multiplier remains the total from the game; Protocol companion boosts must already be included in that total.</p><ul>${units.map(u=>{const t=TRAITS.find(t=>t.id===u.trait.id),active=traitAmount(u,t.id);return `<li><strong>${escapeAttr(u.name)}</strong>: ${escapeAttr(traitLabel(u))} - ${active?'active':'inactive in this slot'} <button class="btn secondary" data-edit-trait="${u.source}" data-trait-unit="${u.unit}">Edit</button></li>`;}).join('')}</ul><p>Passive Credits: ${fmt(passiveTraitIncome(placed))}/s averaged over five-second payments. Mission Efficiency, offline earnings, combat, reward and utility traits are recorded, but do not count as passive working credits. Fusion Preservation keeps the input in its fusion slot and clears its trait. Optimise retains that survivor and checks that later moves and batches have enough space.</p><a href="#/traits">All trait effects and restrictions</a></details>`;
}
function basePageV2(){
 const profileKey=JSON.stringify(state.sharedView?['shared',state.sharedView.ownerId,state.sharedView.profileId]:['own',state.cloud.user?.id||'local',state.cloud.activeProfileId]);
 if(baseMapViewState.profileKey!==profileKey)baseMapViewState={profileKey,ui:{}};
 const mapUi=baseMapViewState.ui;
 const render=()=>{const previousMap=document.querySelector('#baseMapPanel'),previousViewport=previousMap?.querySelector('.tm-viewport');
 const scrollSnapshot=previousMap&&!previousMap.hidden?{x:window.scrollX,y:window.scrollY,left:previousViewport?.scrollLeft||0,top:previousViewport?.scrollTop||0}:null;
 const p=placements(),future=futureRequirements(),replacementProtected=replacementSettings().protect?rebirthProtectedKeys(p):new Set(),rebirthPick=p.placed.reduce((map,x)=>{const previous=map.get(x.name);if(!previous||variantRank(x.variant)>variantRank(previous.variant))map.set(x.name,{variant:x.variant,key:`${x.source}:${x.unit}`});return map},new Map()),productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),baseIncome=placedBaseIncome(productive),stationIncome=productive.reduce((sum,x)=>{const d=state.droids.find(y=>y.name===x.name),match=!isIconic(d)&&x.station===d.type;return sum+(d?.variants[x.variant]?.income||0)*(match?1.1:1)},0),iconicIncomeTotal=[...new Set(productive.map(x=>x.name))].reduce((sum,name)=>sum+iconicIncome(state.droids.find(d=>d.name===name)),0),income=incomeForPlaced(p.placed);
  const slot=(type,index)=>{const occupant=p.placed.find(x=>x.station===type&&x.slot===index);if(occupant){const d=state.droids.find(x=>x.name===occupant.name),cycleStatus=droidCycleStatus(d,occupant.variant,rebirthPick.get(d.name)?.key===`${occupant.source}:${occupant.unit}`),match=!isIconic(d)&&type===d.type,production=slotProductionHtml(d,occupant.variant,type,baseIncome,p.placed,index),productive=PRODUCTIVE_STATIONS.includes(type),locked=Boolean(occupant.lockedSlot),building=isBuilding(occupant);return `<div class="base-slot occupied ${match?'matched-slot':''} ${locked?'slot-pinned':''} ${building?'slot-building':''} cycle-${cycleStatus.kind}" draggable="${DRAG_AND_DROP_ENABLED&&!building?'true':'false'}" data-slot-station="${type}" data-slot-index="${index}" data-source="${occupant.source}" data-unit="${occupant.unit}"><a href="#/droid/${slug(d.name)}"><div>${picture(d,occupant.variant)}</div><strong class="slot-droid-name variant-${occupant.variant.toLowerCase()}">${d.name}</strong><small class="slot-production">${production}</small>${match?'<em class="match-bonus">+10% match</em>':''}${locked?'<em class="lock-status">Locked for Optimise</em>':''}${building?'<em class="build-status">Still building · Optimise will not move it</em>':''}<em class="cycle-status cycle-${cycleStatus.kind}">${cycleStatus.label}</em>${missionSlotBadge(type,index)}</a>${building?`<button class="slot-complete" data-complete-source="${occupant.source}" data-complete-unit="${occupant.unit}" title="Mark ${d.name} as finished building" aria-label="Mark ${d.name} as finished building">✓ Complete</button>`:''}${isIconic(d)?'':`<button class="slot-variant" data-source="${occupant.source}" data-name="${d.name}" data-variant="${occupant.variant}" data-station="${type}" data-slot="${index}" title="Change ${d.name} quality" aria-label="Change ${d.name} quality">◆</button>`}${productive?`<button class="slot-replacement-target" data-replacement-key="${replacementKey(occupant)}" title="Use ${d.name} as replacement target" aria-label="Use ${d.name} as replacement target">⌖</button>`:''}<button class="slot-trait" data-edit-trait="${occupant.source}" data-trait-unit="${occupant.unit}" title="${escapeAttr(traitLabel(occupant))}" aria-label="Edit trait for ${escapeAttr(d.name)}">Trait</button><button class="slot-lock ${locked?'active':''}" data-source="${occupant.source}" data-unit="${occupant.unit}" title="${locked?'Unlock this droid slot':'Lock this droid slot for Optimise'}" aria-label="${locked?'Unlock this droid slot':'Lock this droid slot for Optimise'}">${locked?'🔒':'🔓'}</button><button class="slot-swap" data-source="${occupant.source}" data-unit="${occupant.unit}" title="Swap ${d.name}" aria-label="Swap ${d.name}">⇄</button><button class="slot-delete" data-source="${occupant.source}" title="Remove ${d.name}" aria-label="Remove ${d.name}">×</button></div>`}const unlock=slotUnlockRebirth(type,index),eligible=isSlotEligible(type,index),purchased=isSlotPurchased(type,index),locked=!eligible||!purchased;if(eligible&&!purchased)return `<button class="base-slot locked purchasable" data-purchase-station="${type}" data-purchase-slot="${index}"><span class="slot-icon">${stationIcon(type)}</span>${missionSlotBadge(type,index)}<strong class="slot-purchase-title">Purchase slot</strong><small class="slot-price">${slotPriceLabel(type,index)}</small><small>${Number(unlock)>0&&Number(unlock)<50?`Unlocked at Rebirth ${unlock}`:'Available now'}</small></button>`;const label=locked?lockedSlotLabel(type,index):`Add to ${stationName(type)} slot`;return `<button class="base-slot ${locked?'locked':'open'}" ${locked?'disabled':''} ${locked?'':`data-station="${type}"`} data-slot-index="${index}"><span class="slot-icon">${stationIcon(type)}</span>${missionSlotBadge(type,index)}<small>${label}</small>${locked?`<small class="slot-price">${slotPriceLabel(type,index)}</small>`:''}</button>`};
  const station=type=>{const total=SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length,active=capacity(type),eligible=Array.from({length:total},(_,i)=>i).filter(i=>isSlotEligible(type,i)).length,toPurchase=eligible-active,future=total-eligible,used=p.placed.filter(x=>x.station===type).length,slots=Array.from({length:total},(_,i)=>`${slotDivider(type,i)}${slot(type,i)}`).join('')+protocolSlotsHtml(type,slot);const fusePreview=type==='FUSION'?fusionPreviewHtml():'';const fuseControl=type==='FUSION'?`<button class="btn secondary station-fuse" id="runFusion" type="button" ${used<3?'disabled':''} title="${used<3?'Fill all three Fusion slots first':'Fuse these three droids'}">Fuse</button>`:'';
    return `<section class="station station-${type.toLowerCase().replaceAll('_','-')}"><header><span>${stationIcon(type)}<strong>${stationName(type)}</strong>${fuseControl}</span><small>${used}/${active} slots${toPurchase?` · ${toPurchase} to purchase`:''}${future?` · ${future} locked`:''}</small></header><div class="slot-grid">${slots}</div>${fusePreview}</section>`};
  // One card per droid-and-quality. state.owned keeps a separate row per
  // station-and-slot preference, so two copies of one droid can sit in two rows;
  // that matters to the planner but reads as a duplicate here. The remove button
  // takes one copy off the newest row, so a group of three needs three presses.
  const rosterGroups=[];
  state.owned.forEach((x,index)=>{const group=rosterGroups.find(g=>g.name===x.name&&g.variant===x.variant);
    group?(group.qty+=x.qty,group.last=index):rosterGroups.push({name:x.name,variant:x.variant,qty:x.qty,last:index})});
  // Alphabetical, then by quality within a droid: the roster is something you
  // scan for a name, not a record of the order things were added.
  rosterGroups.sort((left,right)=>left.name.localeCompare(right.name)||variantRank(left.variant)-variantRank(right.variant));
  const roster=rosterGroups.map(g=>{const d=state.droids.find(y=>y.name===g.name);
    return `<div class="roster-card" data-roster-name="${d.name.toLowerCase()}"><a href="#/droid/${slug(d.name)}">${picture(d,g.variant)}<span><strong>${d.name}</strong><small>${variantText(g.variant)} &middot; &times;${g.qty}</small></span></a><button class="icon-btn roster-remove" data-i="${g.last}" title="${g.qty>1?`Remove one of ${g.qty}`:`Remove ${d.name}`}">×</button></div>`}).join('');
  const located=requirementLocations(),units=requirementUnits(p);
  const needed=[...new Set(future.map(x=>x.at))].map(rebirth=>{const rebirthInfo=(state.rebirths[state.cycle]||[]).find(r=>r.to===rebirth);return `<section class="rebirth-group" data-rebirth="${rebirth}"><h3><span>Rebirth: ${rebirth}</span><span class="rebirth-group-rewards">${rebirthRewardHtml(rebirth)}${rebirthInfo?creditAmount(rebirthInfo.creditsCost):''}</span></h3><div class="needed-grid">${future.filter(x=>x.at===rebirth).map(req=>neededCardHtml(req,{located,units,rebirth})).join('')}</div></section>`}).join('');
  const blueprintTotal=Math.max(state.novaShop?.upgrades.find(x=>x.id==='blueprint-storage')?.levels.length||3,capacity('BLUEPRINT_STORAGE')),blueprintSlots=Array.from({length:blueprintTotal},(_,i)=>{const bp=state.blueprints.find(x=>Number(x.slot)===i),locked=i>=capacity('BLUEPRINT_STORAGE');if(bp){const d=state.droids.find(x=>x.name===bp.name),index=state.blueprints.indexOf(bp);return `<div class="base-slot occupied blueprint-card ${locked?'locked-blueprint':''}"><a href="#/droid/${slug(d.name)}"><div>${picture(d,bp.variant)}</div><strong>${d.name}</strong><small>${variantText(bp.variant)} blueprint</small></a><button class="slot-swap craft-blueprint" data-blueprint="${index}" title="Craft into Build" aria-label="Craft ${d.name} into Build">⚒</button><button class="slot-delete delete-blueprint" data-blueprint="${index}" title="Remove blueprint" aria-label="Remove ${d.name} blueprint">×</button></div>`}return `<button class="base-slot ${locked?'locked':'open'} blueprint-open" ${locked?'disabled':''} data-blueprint-slot="${i}"><span class="slot-icon">${stationIcon('BLUEPRINT_STORAGE')}</span><small>${locked?`Unlock Blueprint Storage ${i+1} in Nova Shop`:'Add blueprint'}</small>${locked?`<small>${slotPriceLabel('BLUEPRINT_STORAGE',i)}</small>`:''}</button>`}).join('');
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Base</div>${baseTraitSummary(p.placed)}<div class="base-heading"><div><p class="eyebrow">${state.sharedView?'Shared base':'Personal base'}</p><h1>${state.sharedView?`${escapeAttr(state.sharedView.ownerName)} · ${escapeAttr(state.sharedView.profileName)}`:'Base'}</h1></div><div class="base-actions"><button class="btn secondary base-panel-toggle" id="toggleScrapPanel">Hide Scrap</button><button class="btn secondary base-panel-toggle" id="toggleReplacementPanel">Hide Replacements</button><button class="btn secondary base-panel-toggle" id="toggleOutlookPanel">Hide Outlook</button><button class="btn secondary" id="fusionMine">My fusions</button><button class="btn secondary" id="transferBase" title="Import or export Base" aria-label="Import or export Base"><span class="btn-label">Import / Export</span></button></div></div><div class="base-top"><div class="stat"><small>Credits / second</small><strong>${fmt(income)}</strong></div><div class="stat"><small>Credits / minute</small><strong>${fmt(income*60)}</strong></div><div class="stat"><small>Credits / hour</small><strong>${fmt(income*3600)}</strong></div><div class="stat"><small>Droids owned</small><strong>${state.owned.reduce((s,x)=>s+x.qty,0)}</strong></div></div>${partyControlsHtml()}${baseHealthCheckHtml(p)}${scrapCalculatorHtml(p.placed)}${incomeBreakdownHtml(p.placed)}${chipSellCalculatorHtml(p)}${replacementCalculatorHtml(p)}${baseRebirthSummaryHtml()}${protocolSummaryHtml(p.placed)}${craftingSummaryHtml(p.placed)}<details class="trait-guide"><summary>Missions, offline earnings and Chip Finder</summary><div id="baseMissionTools"></div></details><div class="base-layout-v2"><div class="typed-stations">${['WORKER','ASTROMECH','BATTLE'].map(region=>'<div class="region-stations">'+station(region)+'</div>').join('')}</div><div class="build-side">${station('BUILD')}</div><section class="roster-wide"><header><div><strong>Roster</strong><span>${state.owned.reduce((s,x)=>s+x.qty,0)} droids${p.overflow.length?` · ${p.overflow.length} over capacity`:''}</span></div><input id="rosterSearch" class="form-control" placeholder="Search roster…"></header><div id="rosterCards">${roster||'<p class="roster-empty">No droids yet. Click any empty slot to add one.</p>'}</div></section></div><div class="needed-heading"><h2>Needed later in this cycle</h2></div>${outstandingDroidsHtml(p)}<div class="needed-search"><input id="neededSearch" class="form-control" aria-label="Search rebirth requirements below" placeholder="Search needed droids..."></div><div id="neededGroups">${needed||'<div class="empty">Nothing else is required in this cycle.</div>'}</div><p id="neededEmpty" class="empty" hidden>No requirements match that search.</p>`;
  document.querySelector('.build-side').insertAdjacentHTML('afterend',`<div class="blueprint-side"><section class="station station-blueprint"><header><span>${stationIcon('BLUEPRINT_STORAGE')}<strong>Blueprint Storage</strong></span><small>${state.blueprints.length}/${capacity('BLUEPRINT_STORAGE')} slots</small></header><div class="slot-grid">${blueprintSlots}</div></section></div><div class="special-stations">${station('LOUNGE')}${station('COMPANION')}${station('UPGRADE_CHIP')}<div class="fusion-panel">${station('FUSION')}${fusionBuildSection(station('FUSION_BUILD'))}</div></div>`);attachCollapsiblePanels();attachReplacementCalculator(render);renderBaseSidebar(render);attachSlotDragAndDrop(p,render);attachNeededCardHandlers(render);attachRebirthQuickBar(render);document.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>showSlotPicker(b.dataset.station,render,Number(b.dataset.slotIndex)));document.querySelectorAll('[data-blueprint-slot]').forEach(b=>b.onclick=()=>showBlueprintPicker(Number(b.dataset.blueprintSlot),render));document.querySelectorAll('.craft-blueprint').forEach(b=>b.onclick=()=>craftBlueprint(Number(b.dataset.blueprint),render));mountMissionTools(document.querySelector('#baseMissionTools'),missionToolsContext(p.placed));document.querySelectorAll('.delete-blueprint').forEach(b=>b.onclick=()=>{state.blueprints.splice(Number(b.dataset.blueprint),1);save();render()});document.querySelectorAll('.slot-delete:not(.delete-blueprint)').forEach(b=>b.onclick=()=>{removeOwnedUnit(Number(b.dataset.source));render()});document.querySelectorAll('.slot-variant').forEach(b=>b.onclick=()=>showCardVariantModal({source:Number(b.dataset.source),name:b.dataset.name,variant:b.dataset.variant,station:b.dataset.station,slot:Number(b.dataset.slot)},render));document.querySelectorAll('.slot-replacement-target').forEach(b=>b.onclick=()=>{localStorage.setItem('droid-archive-replacement-target',b.dataset.replacementKey);localStorage.setItem('droid-archive-replacement-collapsed','0');render();requestAnimationFrame(()=>document.querySelector('.replacement-calculator')?.scrollIntoView({behavior:'smooth',block:'start'}))});document.querySelectorAll('.slot-lock').forEach(b=>b.onclick=()=>{toggleSlotLock(Number(b.dataset.source),Number(b.dataset.unit));render()});document.querySelectorAll('.slot-complete').forEach(b=>b.onclick=()=>{completeBuild(Number(b.dataset.completeSource),Number(b.dataset.completeUnit));render()});document.querySelector('#runFusion')?.addEventListener('click',()=>runFusion(render));document.querySelector('#toggleBaseMap')?.addEventListener('click',()=>{localStorage.setItem('droid-archive-map-hidden',baseViewIsMap()?'1':'0');render()});document.querySelectorAll('.slot-swap:not(.craft-blueprint)').forEach(b=>b.onclick=()=>showSwapModal({source:Number(b.dataset.source),unit:Number(b.dataset.unit)},render));document.querySelectorAll('.roster-remove').forEach(b=>b.onclick=()=>{removeOwnedUnit(Number(b.dataset.i));render()});document.querySelector('#rosterSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.roster-card').forEach(c=>c.hidden=!c.dataset.rosterName.includes(q))};document.querySelector('#neededSearch').oninput=e=>{const q=e.target.value.toLowerCase();let shown=0;document.querySelectorAll('.rebirth-group').forEach(group=>{let groupShown=0;group.querySelectorAll('.needed-card').forEach(card=>{const match=card.dataset.neededName.includes(q);card.hidden=!match;if(match){shown++;groupShown++}});group.hidden=groupShown===0});document.querySelector('#neededEmpty').hidden=shown!==0};document.querySelector('#outstandingSearch')?.addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();let shown=0;document.querySelectorAll('#outstandingPanel .outstanding-body>section').forEach(section=>{let matches=0;section.querySelectorAll('.outstanding-card').forEach(card=>{const match=card.textContent.toLowerCase().includes(q);card.hidden=!match;if(match)matches++});section.hidden=Boolean(q)&&matches===0;shown+=matches});document.querySelector('#outstandingEmpty').hidden=!q||shown>0});document.querySelector('#outstandingPanel')?.addEventListener('toggle',e=>localStorage.setItem('droid-archive-outstanding-open',e.target.open?'1':'0'));document.querySelector('#transferBase').onclick=()=>showTransferModal(render);document.querySelector('#fusionMine').onclick=showFusionMineModal
  document.querySelectorAll('[data-purchase-station]').forEach(button=>button.onclick=()=>purchaseRebirthSlot(button.dataset.purchaseStation,Number(button.dataset.purchaseSlot),render));
  {
    document.querySelector('.base-map')?.remove();
    const cards=document.querySelector('.base-layout-v2');cards.classList.remove('map-mode');
    const host=document.createElement('div');host.id='baseMapPanel';host.hidden=!baseViewIsMap();cards.before(host);
    const mapToggle=document.querySelector('#toggleBaseMap');mapToggle.setAttribute('aria-controls',host.id);mapToggle.setAttribute('aria-expanded',String(!host.hidden));
    const extraSlots=[...Array.from({length:8},(_,i)=>({station:'LOUNGE',slot:i+13})),...Array.from({length:SLOT_RULES.COMPANION.initial+SLOT_RULES.COMPANION.unlocks.length},(_,slot)=>({station:'COMPANION',slot})),...Array.from({length:blueprintTotal},(_,slot)=>({station:'BLUEPRINT_STORAGE',slot}))];
    const mapPlaced=[...p.placed,...state.blueprints.map((bp,blueprintIndex)=>({...bp,slot:Number(bp.slot),station:'BLUEPRINT_STORAGE',blueprint:true,blueprintIndex}))];
    const at=s=>mapPlaced.find(x=>x.station===s.station&&x.slot===s.slot);
    const open=s=>s.station==='BLUEPRINT_STORAGE'?s.slot<capacity('BLUEPRINT_STORAGE'):isSlotEligible(s.station,s.slot)&&isSlotPurchased(s.station,s.slot);
    const canMove=(from,to)=>{
      if(!from||!to||from.station===to.station&&from.slot===to.slot||!open(to))return false;
      const a=at(from),b=at(to);if(!a)return false;
      if(a.blueprint)return to.station==='BLUEPRINT_STORAGE'||to.station==='BUILD'&&!b;
      return to.station!=='BLUEPRINT_STORAGE'&&!isBuilding(a)&&(!b||!isBuilding(b))&&canUseStation(state.droids.find(d=>d.name===a.name),to.station)&&(!b||canUseStation(state.droids.find(d=>d.name===b.name),from.station));
    };
    testMapPage({host,slots:mapSlots().filter(s=>s.station!=='BLUEPRINT_STORAGE'),extraSlots,placed:mapPlaced,droids:state.droids,picture,stationIcon,variantLabel,label:stationName,available:open,escape:escapeAttr,ui:mapUi,rebirthUses:mapRebirthUsesHtml,manage:{
      canMove,move:(from,to)=>{
        if(!canMove(from,to))return;const a=at(from),b=at(to);
        if(a.blueprint){
          if(to.station==='BUILD'){craftBlueprint(a.blueprintIndex,render,to.slot);return;}
          state.blueprints[a.blueprintIndex].slot=to.slot;if(b)state.blueprints[b.blueprintIndex].slot=from.slot;save();render();return;
        }
        moveUnitToSlot(`${a.source}:${a.unit}`,to.station,to.slot,render);
      },
      add:s=>s.station==='BLUEPRINT_STORAGE'?showBlueprintPicker(s.slot,render):showSlotPicker(s.station,render,s.slot),
      trait:x=>showTraitModal(x,render),traitLabel,variant:x=>x.blueprint?showBlueprintPicker(x.slot,render):showCardVariantModal(x,render),
      remove:x=>{if(x.blueprint){state.blueprints.splice(x.blueprintIndex,1);save();}else removeOwnedUnit(x.source);render();},
      craft:x=>craftBlueprint(x.blueprintIndex,render),
      lock:x=>{toggleSlotLock(x.source,x.unit);render();},
      complete:x=>{completeBuild(x.source,x.unit);render();},
      iconic:x=>isIconic(state.droids.find(d=>d.name===x.name)),
      ...Object.fromEntries(['work','companion','lounge','fusion','sell','return'].map(action=>[action,x=>mapDroidAction(x,action,render)])),
      lockedLabel:s=>s.station==='BLUEPRINT_STORAGE'?'Unlock Blueprint Storage in Nova Shop':lockedSlotLabel(s.station,s.slot),price:s=>slotPriceLabel(s.station,s.slot),
      purchase:s=>{if(isSlotEligible(s.station,s.slot))purchaseRebirthSlot(s.station,s.slot,render);},
      eligible:s=>s.station!=='BLUEPRINT_STORAGE'&&isSlotEligible(s.station,s.slot),
      production:x=>x.blueprint?'Stored blueprint':slotProductionHtml(state.droids.find(d=>d.name===x.name),x.variant,x.station,baseIncome,p.placed,x.slot),
      building:x=>!x.blueprint&&isBuilding(x)
    }});
    const toggle=document.createElement('button');toggle.className='btn secondary base-panel-toggle';toggle.id='tmCardsToggle';toggle.setAttribute('aria-controls','tmTraditionalCards');cards.id='tmTraditionalCards';document.querySelector('#toggleBaseDetail').before(toggle);
    const setCards=()=>{const hidden=localStorage.getItem('droid-archive-testmap-cards-hidden')==='1';cards.hidden=hidden;toggle.innerHTML=`<img class="command-icon command-art" src="assets/nav/Cards.png" alt=""><span>${hidden?'Show':'Hide'} Cards</span>`;toggle.setAttribute('aria-expanded',String(!hidden));toggle.classList.toggle('active',!hidden);};
    toggle.onclick=()=>{localStorage.setItem('droid-archive-testmap-cards-hidden',cards.hidden?'0':'1');setCards();};setCards();
  }
  const restoreMapScroll=()=>{if(!scrollSnapshot)return;const map=document.querySelector('#baseMapPanel');if(!map||map.hidden)return;const viewport=map.querySelector('.tm-viewport');if(viewport)viewport.scrollTo({left:scrollSnapshot.left,top:scrollSnapshot.top,behavior:'instant'});window.scrollTo({left:scrollSnapshot.x,top:scrollSnapshot.y,behavior:'instant'});};
  restoreMapScroll();
  requestAnimationFrame(()=>{decorateCommandDeck('/base');renderPurchaseCheckpoint();restoreMapScroll();if(purchaseCheckpointFocus){purchaseCheckpointFocus=false;const banner=app.querySelector('[data-purchase-checkpoint]');banner?.scrollIntoView({block:'start',behavior:'instant'});if(banner){const overlap=(app.querySelector('.base-heading')?.getBoundingClientRect().bottom||0)+16-banner.getBoundingClientRect().top;if(overlap>0)window.scrollBy({top:-overlap,behavior:'instant'});}}});
 };render()}
function stabiliseProjectedPlacements(baseP,placed,slotIndices=stationSlotIndices){const current=new Map(baseP.placed.map(x=>[`${x.source}:${x.unit}`,x])),stations=[...new Set(placed.map(x=>x.station))],stable=[];for(const station of stations){const list=placed.filter(x=>x.station===station),slots=slotIndices(station),pinned=list.filter(x=>x.missionPriority||x.companionActivity||x.lockedSlot),used=new Set(pinned.map(x=>x.slot)),floating=[];stable.push(...pinned);for(const item of list.filter(x=>!pinned.includes(x))){const old=current.get(`${item.source}:${item.unit}`);if(old?.station===station&&slots.includes(old.slot)&&!used.has(old.slot)){used.add(old.slot);stable.push({...item,slot:old.slot})}else floating.push(item)}const spare=new Set(slots.filter(slot=>!used.has(slot))),colliding=[];
    for(const item of floating){if(spare.has(item.slot)){spare.delete(item.slot);stable.push(item)}else colliding.push(item)}
    for(const item of colliding){
      const old=current.get(`${item.source}:${item.unit}`);
      const slot=slotFillOrder(station,old||null).find(i=>spare.has(i));
      if(slot===undefined){stable.push(item);continue}
      spare.delete(slot);stable.push({...item,slot});
    }
  }
  return stable;
}
// The saved shape of a layout. Pulled out of optimisedPlacements because
// applying recorded landings moves droids after the fact, and the rows written
// to the save have to be rebuilt from where they ended up.
const optimisedRows=(placed,overflow)=>[...placed,...overflow].map(x=>({name:x.name,variant:x.variant,qty:1,...(x.station?{preferred:x.station,preferredSlot:x.slot}:{}),...(x.lockedSlot?{lockedSlot:true}:{}),...(x.built?{built:true}:{}),...(normaliseTrait(x.trait,state.droids.find(d=>d.name===x.name))?{trait:normaliseTrait(x.trait,state.droids.find(d=>d.name===x.name))}:{})}));
// A layout can be stuck: every store full, and every spare droid kept for fusion
// or for a rebirth, so a better earner sitting in a Build tank never gets a slot
// because the droid it would displace has nowhere to go. Fusion is the way out.
// A batch worth making consumes its three inputs, so a kept-for-fusion droid a
// batch will use needs no slot at all: the slot it stands in is free for the
// displaced droid. The first pass places as before; when it fell short of the
// plan, the inputs of the batches the walk can make now are taken off the base
// and the layout is placed again without them.
// A second way out, tried last: a finished droid's card in a Build tank offers
// Swap with a Companion, so the Companion can take the tank, be swapped into
// the slot the displaced droid leaves, and swap back out once that droid is the
// Companion. So a tank the plan empties can hold the displaced droid, at the
// price of a tank that cannot craft until it moves on. Fusion, which makes a
// droid rather than parking one, comes first.
function optimisedPlacements(baseP,plan){
  const first=optimisedPlacementsPass(baseP,plan);
  if(planHonoured(plan,first))return first;
  let best=first;
  const consumed=state.optimiseFuseFirst!==false?fusionFreesSlots(baseP,plan,first):new Set();
  if(consumed.size){
    const second=optimisedPlacementsPass(baseP,plan,consumed);
    // A layout stands only if its own batches still use every droid that was
    // taken off the base for them; otherwise one would have no slot. Here that
    // can fail for a reason the tank pass cures: the result's Fusion Build slot
    // is freed by a droid that only leaves once a tank takes the one it displaces.
    if(fusionConsumesAll(baseP,second,consumed)){second.fallback=first;if(planHonoured(plan,second))return second;best=second;}
  }
  let third=optimisedPlacementsPass(baseP,plan,consumed,{tanks:true});
  if(consumed.size&&!fusionConsumesAll(baseP,third,consumed))third=optimisedPlacementsPass(baseP,plan,new Set(),{tanks:true});
  third.fallback=best;
  return planHonoured(plan,third)||third.overflow.length<best.overflow.length?third:best;
}
// Whether a layout puts every droid the search assigned where it asked, with
// nothing left over.
function planHonoured(plan,projected){
  const keyOf=x=>`${x.source}:${x.unit}`,assigned=new Map((plan.assignments||[]).map(x=>[x.key,x]));
  return !projected.overflow.length&&projected.placed.every(x=>{const goal=assigned.get(keyOf(x));return !goal||goal.station===x.station&&goal.slot===x.slot});
}
// Which kept droids a fusion batch would take, when the first pass could not
// honour the plan. Fusion Build capacity counts a tank whose finished droid the
// plan sends to work, even though the first pass had to leave it in the tank.
function fusionFreesSlots(baseP,plan,projected){
  const keyOf=x=>`${x.source}:${x.unit}`,assigned=new Map((plan.assignments||[]).map(x=>[x.key,x]));
  if(planHonoured(plan,projected))return new Set();
  const hopeful={...projected,placed:projected.placed.map(x=>{const goal=assigned.get(keyOf(x));return x.station==='FUSION_BUILD'&&x.built&&!x.lockedSlot&&goal&&goal.station!=='FUSION_BUILD'?{...x,station:goal.station,slot:goal.slot}:x})};
  const {batches}=optimiseFusionBatches(baseP,hopeful),placedKeys=new Set(projected.placed.map(keyOf));
  return new Set(batches.flatMap(batch=>batch.inputs.map(keyOf)).filter(key=>placedKeys.has(key)));
}
function fusionConsumesAll(baseP,projected,consumed){
  const keyOf=x=>`${x.source}:${x.unit}`,{batches}=optimiseFusionBatches(baseP,projected),used=new Set(batches.flatMap(batch=>batch.inputs.map(keyOf)));
  return [...consumed].every(key=>used.has(key));
}
function optimisedPlacementsPass(baseP,plan,consumed=new Set(),{tanks=false}={}){
  const assigned=new Map((plan.assignments||[]).map(x=>[x.key,x])),current=new Map(baseP.placed.map(x=>[`${x.source}:${x.unit}`,x])),occupied=Object.fromEntries(Object.keys(SLOT_RULES).map(type=>[type,new Set()])),placed=[],overflow=[],sell=[],units=expandedOwned().filter(x=>!consumed.has(`${x.source}:${x.unit}`));
  // The droids a fusion takes: off the base for placing, and named for the walk.
  const fusing=expandedOwned().filter(x=>consumed.has(`${x.source}:${x.unit}`)).map(x=>({...x,keepReason:'fusion'}));
  const claim=(unit,station,slot)=>{const origin=current.get(`${unit.source}:${unit.unit}`);occupied[station].add(slot);placed.push({...unit,station,slot,...(origin&&['BUILD','FUSION_BUILD'].includes(station)&&!isBuilding(origin)?{built:true}:{})})},
  // A tank a droid can be swapped into: it holds a finished, unlocked droid now
  // (the one whose card offers Swap) and the layout has not given it to anyone.
  seatToSwap=tanks&&baseP.placed.some(x=>x.station==='COMPANION'&&!x.lockedSlot&&!isBuilding(x)),
  vacatedTank=station=>seatToSwap?stationSlotIndices(station).find(slot=>!occupied[station].has(slot)&&baseP.placed.some(x=>{const key=`${x.source}:${x.unit}`,goal=assigned.get(key);return x.station===station&&x.slot===slot&&!x.lockedSlot&&!isBuilding(x)&&goal&&(goal.station!==station||goal.slot!==slot)&&!consumed.has(key)})):undefined,free=(station,origin)=>slotFillOrder(station,origin).find(i=>!occupied[station].has(i))??-1,canKeep=(station,slot)=>station&&stationSlotIndices(station).includes(slot)&&!occupied[station].has(slot);
  const lockedKeys=new Set(baseP.placed.filter(x=>x.lockedSlot||isBuilding(x)).map(x=>`${x.source}:${x.unit}`));
  for(const locked of baseP.placed.filter(x=>lockedKeys.has(`${x.source}:${x.unit}`)))if(canKeep(locked.station,locked.slot))claim(locked,locked.station,locked.slot);
  for(const unit of units){const key=`${unit.source}:${unit.unit}`,target=assigned.get(key);if(target)claim(target.missionPriority?{...unit,missionPriority:true}:target.companionActivity?{...unit,companionActivity:true}:unit,target.station,target.slot)}
  // The copy a rebirth will use is the best one you own, wherever it stands. A
  // better or equal copy already working in a slot covers the rebirth, so the
  // one in storage is a duplicate: free to fuse, or to sell.
  const bestFuture=new Map();
  for(const unit of [...units].sort((a,b)=>Number(assigned.has(`${b.source}:${b.unit}`))-Number(assigned.has(`${a.source}:${a.unit}`)))){const previous=bestFuture.get(unit.name);if(!previous||variantRank(unit.variant)>variantRank(previous.variant))bestFuture.set(unit.name,{variant:unit.variant,key:`${unit.source}:${unit.unit}`})}
  const candidates=[],droidexKeepers=new Map(),droidexKeptKeys=new Map(),keptByHand=new Map(),spared=sparedFromSelling(),keepBuildOpen=Boolean(state.optimiseFreeBuild),strictKeepBuild=keepBuildOpen&&optimiseFreeBuildMode()!=='unused-income';
  // A droid in the Upgrade Chip slot is producing, so it is claimed here, before
  // the unused-for-rebirth sell pass below. Picking afterwards meant the best
  // chip earner was sold for having no rebirth use and a weaker droid inherited
  // the slot, cutting chip output.
  // Work only lands on the chip once every Worker, Astromech and Battle slot is
  // full, so with any left empty only a droid already standing there can stay.
  const chipRateOf=unit=>upgradeChipRate(state.droids.find(x=>x.name===unit.name),unit.variant),chipPicks=new Set();
  const roomsFull=PRODUCTIVE_STATIONS.every(station=>stationSlotIndices(station).every(slot=>occupied[station].has(slot)));
  for(const chipSlot of stationSlotIndices('UPGRADE_CHIP')){
    if(occupied.UPGRADE_CHIP.has(chipSlot))continue;
    const best=units.filter(unit=>{const key=`${unit.source}:${unit.unit}`;return !assigned.has(key)&&!lockedKeys.has(key)&&!chipPicks.has(key)&&chipRateOf(unit)>0&&(roomsFull||current.get(key)?.station==='UPGRADE_CHIP')}).sort((a,b)=>chipRateOf(b)-chipRateOf(a)||Number(current.get(`${b.source}:${b.unit}`)?.station==='UPGRADE_CHIP')-Number(current.get(`${a.source}:${a.unit}`)?.station==='UPGRADE_CHIP'))[0];
    if(!best)break;
    chipPicks.add(`${best.source}:${best.unit}`);claim(best,'UPGRADE_CHIP',chipSlot);
  }
  // Companion slots are stocked before anything gets lounged or sold, so the
  // droid carrying the boost you asked for is not thrown away for earning little
  // — earning little is exactly why it is free to sit there. Preferred Iconics
  // come first, then one pick per chosen boost, cycling if you chose fewer boosts
  // than you have slots.
  const companionPicks=new Set(),companionKept=new Map(),freeCompanionSlots=stationSlotIndices('COMPANION').filter(slot=>!occupied.COMPANION.has(slot));
  if(freeCompanionSlots.length){
    const spare=()=>units.filter(u=>{const key=`${u.source}:${u.unit}`;return !assigned.has(key)&&!lockedKeys.has(key)&&!chipPicks.has(key)&&!companionPicks.has(key)});
    // A preferred droid already occupying a locked Companion slot has fulfilled
    // that choice. Missing/unavailable preferences must not consume a free slot.
    const queue=[...new Set(preferredCompanions())].filter(name=>!placed.some(x=>x.station==='COMPANION'&&x.name===name)),goals=companionGoals();
    let goalIndex=0;
    // Best boost first; ties go to the lowest earner. Work, mission and chip
    // assignments remain excluded: Companion boosts choose only spare droids.
    const bestOf=(pool,goalId)=>pool.sort((a,b)=>{const da=state.droids.find(d=>d.name===a.name),db=state.droids.find(d=>d.name===b.name);
      return (goalId?unitCompanionGoal(b,goalId)-unitCompanionGoal(a,goalId):0)||(da?.variants[a.variant]?.income||0)-(db?.variants[b.variant]?.income||0)})[0];
    for(const slot of freeCompanionSlots){
      let best,goal;
      while(queue.length&&!best){const want=queue.shift();best=bestOf(spare().filter(u=>u.name===want));}
      for(let tried=0;!best&&tried<goals.length;tried++){
        const want=goals[goalIndex++%goals.length];
        goal=COMPANION_GOALS.find(g=>g.id===want);
        best=bestOf(spare().filter(u=>unitCompanionGoal(u,goal.id)>0),goal.id);
      }
      if(!best)continue;
      const d=state.droids.find(x=>x.name===best.name);
      companionPicks.add(`${best.source}:${best.unit}`);
      companionKept.set(`${best.source}:${best.unit}`,goal?`Companion · ${goal.label.toLowerCase()} (${droidAttribute(d,best.variant)})`:'Companion · preferred pick');
      claim(best,'COMPANION',slot);
    }
  }
  // Mission-priority Iconics are reserved before credit assignments. R2-D2 returns two
  // rewards and CB-23 unlocks a mission nothing else can reach, so they take the
  // first two slots wherever they are free; then the other Astromech Iconics for
  // their mission times, then simply the best Astromechs you own.
  const missionPicks=new Set(),missionKept=new Map();
  const missionRank=unit=>{const d=state.droids.find(x=>x.name===unit.name);
    return unit.name==='R2-D2'?0:unit.name==='CB-23'?1:2};
  const missionWhy=['R2-D2 returns two rewards','CB-23 opens its own mission','Fastest mission progress including traits'];
  for(const slot of ASTROMECH_MISSION_SLOTS){
    if(!stationSlotIndices('ASTROMECH').includes(slot)||occupied.ASTROMECH.has(slot))continue;
    const pool=units.filter(u=>{const key=`${u.source}:${u.unit}`;
      return !assigned.has(key)&&!lockedKeys.has(key)&&!chipPicks.has(key)&&!companionPicks.has(key)&&!missionPicks.has(key)
        &&state.droids.find(d=>d.name===u.name)?.type==='ASTROMECH'
         &&(!isIconic(state.droids.find(d=>d.name===u.name))||astromechIconicRole(u.name)==='mission')});
    const best=pool.sort((a,b)=>{const da=state.droids.find(x=>x.name===a.name),db=state.droids.find(x=>x.name===b.name);
      return missionRank(a)-missionRank(b)||missionProgress({...b,station:'ASTROMECH',slot},db).progress-missionProgress({...a,station:'ASTROMECH',slot},da).progress||rarityRank(db)-rarityRank(da)||variantRank(b.variant)-variantRank(a.variant)
        ||(db?.variants[b.variant]?.income||0)-(da?.variants[a.variant]?.income||0)})[0];
    if(!best)break;
    missionPicks.add(`${best.source}:${best.unit}`);
    missionKept.set(`${best.source}:${best.unit}`,`Mission slot ${slot+1} · ${missionWhy[missionRank(best)]}`);
    claim(best,'ASTROMECH',slot);
  }
  for(const unit of units){
    const key=`${unit.source}:${unit.unit}`;
    if(assigned.has(key)||lockedKeys.has(key)||chipPicks.has(key)||companionPicks.has(key)||missionPicks.has(key))continue;
    const d=state.droids.find(x=>x.name===unit.name),cycleStatus=d?droidCycleStatus(d,unit.variant,bestFuture.get(unit.name)?.key===key):{kind:'unused'};
    if(keepForFusion(unit)){
      // Matching rules forbid selling even when this copy is also needed for a
      // rebirth. Keep that purpose separate from spare fusion ingredients.
      const keepReason=cycleStatus.kind==='unused'?'fusion':'rebirth';
      candidates.push({unit:{...unit,keepReason},fallbacks:loungeLikeStations(),old:current.get(key),betterStorageOpen:false,kept:false,spared:true,keepReason});continue;
    }
    if(cycleStatus.kind==='unused'&&!isIconic(d)){
      // You pressed Keep on this one in the plan, so it is stored rather than sold.
      if(spared.includes(key)){
        keptByHand.set(key,'Kept by you · you chose not to sell this one');
        candidates.push({unit,fallbacks:loungeLikeStations(),old:current.get(key),betterStorageOpen:false,kept:false,spared:true});
        continue;
      }
      // Not needed for a rebirth, but upgrading it could still complete Droidex
      // entries nothing else can reach. Keep one copy per droid, and only while
      // there is storage free — a Droidex entry is not worth an overflowing base.
      const gaps=state.optimiseKeepDroidex===false?[]:droidexGapsAbove(unit.name,unit.variant);
      if(gaps.length&&!droidexKeepers.has(unit.name)&&loungeLikeStations().some(station=>free(station)>=0)){
        droidexKeepers.set(unit.name,gaps);
        droidexKeptKeys.set(key,`Kept for Droidex · ${gaps.map(v=>variantText(v)).join(', ')} still missing`);
        candidates.push({unit,fallbacks:loungeLikeStations(),old:current.get(key),betterStorageOpen:false,kept:false});
        continue;
      }
      sell.push({...unit,sellReason:cycleStatus.label});continue;
    }
    const productiveFallback=PRODUCTIVE_STATIONS.includes(d?.type)?[d.type,...['WORKER','ASTROMECH','BATTLE'].filter(x=>x!==d.type)]:['WORKER','ASTROMECH','BATTLE'],fallbacks=[...loungeLikeStations(),...(roomsFull||current.get(key)?.station==='UPGRADE_CHIP'?['UPGRADE_CHIP']:[]),...(strictKeepBuild?[]:['BUILD']),...productiveFallback],old=current.get(key),betterStorageOpen=old?.station==='BUILD'&&(strictKeepBuild||['LOUNGE','COMPANION','UPGRADE_CHIP'].some(station=>free(station)>=0));
    candidates.push({unit,fallbacks,old,betterStorageOpen,kept:false})
  }
  if(strictKeepBuild)candidates.sort((a,b)=>optimiseStorageKeepScore(b)-optimiseStorageKeepScore(a));
  for(const item of candidates){
    if(item.kept)continue;
    const {unit,fallbacks,old,betterStorageOpen}=item;
    if(old&&fallbacks.includes(old.station)&&canKeep(old.station,old.slot)&&!betterStorageOpen){claim(unit,old.station,old.slot);item.kept=true}
  }
  for(const item of candidates){
    if(item.kept)continue;
    const {unit,fallbacks,old}=item;
    let station='',slot=-1;
    for(const fallback of fallbacks){if(fallback==='BUILD'&&old?.station!=='BUILD')continue;slot=free(fallback,old);if(slot>=0){claim(unit,fallback,slot);station=fallback;break}}
    // Last resort, when asked: a tank the layout empties, reached by Companion swap.
    // A droid already standing in a tank keeps it; only a droid with no slot at all
    // takes one the layout empties.
    if(!station&&seatToSwap&&!keepBuildOpen){
      if(old&&['BUILD','FUSION_BUILD'].includes(old.station)&&!occupied[old.station].has(old.slot)){claim(unit,old.station,old.slot);station=old.station}
      else for(const tank of ['BUILD','FUSION_BUILD']){slot=vacatedTank(tank);if(slot!==undefined){claim(unit,tank,slot);station=tank;break}}
    }
    if(!station){const d=state.droids.find(x=>x.name===unit.name);if(item.spared)overflow.push(item.keepReason?{...unit,keepReason:item.keepReason}:unit);else if(strictKeepBuild&&!isIconic(d))sell.push({...unit,sellReason:`Sold to keep Build slots open · ${optimiseFreeBuildModeLabel(optimiseFreeBuildMode()).toLowerCase()} priority`});else overflow.push(unit)}
  }
  // The game cannot hold a droid in mid-air. One with nowhere to go stays in
  // its slot, and the newcomer that had taken that slot goes back to its own
  // old slot while that is still free.
  for(const item of candidates){
    const key=`${item.unit.source}:${item.unit.unit}`,index=overflow.findIndex(x=>`${x.source}:${x.unit}`===key),old=item.old;
    if(index<0||!old)continue;
    // A droid with no rebirth use and nothing protecting it is sold rather
    // than kept in a slot a better earner wants.
    const d=state.droids.find(x=>x.name===item.unit.name),bestCopy=!units.some(x=>x.name===item.unit.name&&variantRank(x.variant)>variantRank(item.unit.variant));
    if(!item.spared&&!item.keepReason&&!isIconic(d)&&!item.unit.lockedSlot&&item.unit.keepReason!=='fusion'&&!keepForFusion(item.unit)&&!isBuilding(old)&&droidCycleStatus(d,item.unit.variant,bestCopy).kind==='unused'){
      overflow.splice(index,1);sell.push({...item.unit,sellReason:'No free slot to keep it'});continue;
    }
    // First choice costs nothing: a finished droid the layout was only moving
    // from its Build or Fusion Build tank into the Lounge stays in the tank, and
    // this droid takes the Lounge slot instead.
    const tankOrder=keepBuildOpen?['FUSION_BUILD','BUILD']:['BUILD','FUSION_BUILD'];
    const resting=placed.filter(x=>x.station==='LOUNGE'&&!lockedKeys.has(`${x.source}:${x.unit}`)).map(x=>({x,was:current.get(`${x.source}:${x.unit}`)})).filter(({was})=>was&&tankOrder.includes(was.station)&&was.built&&!placed.some(y=>y.station===was.station&&y.slot===was.slot)).sort((a,b)=>tankOrder.indexOf(a.was.station)-tankOrder.indexOf(b.was.station))[0];
    if(resting&&canUseStation(d,'LOUNGE')){
      const {x,was}=resting,loungeSlot=x.slot;
      placed.splice(placed.indexOf(x),1);occupied.LOUNGE.delete(loungeSlot);
      const {station:_s,slot:_l,built:_b,...restingUnit}=x;
      claim(restingUnit,was.station,was.slot);
      overflow.splice(index,1);claim(item.unit,'LOUNGE',loungeSlot);continue;
    }
    // Otherwise it keeps its slot, and whoever was given that slot goes back to
    // their own, and so on down the line until someone's old slot is free. Every
    // step puts a droid back where it already stands, so the chain always ends.
    const chain=[];let wanted=old,blocked=false;
    for(let guard=0;guard<placed.length+2;guard++){
      const holder=placed.find(x=>x.station===wanted.station&&x.slot===wanted.slot);
      if(!holder){blocked=!canKeep(wanted.station,wanted.slot);break}
      const holderKey=`${holder.source}:${holder.unit}`,holderOld=current.get(holderKey);
      if(!holderOld||lockedKeys.has(holderKey)||holder.missionPriority||holder.companionActivity||holderOld.station===wanted.station&&holderOld.slot===wanted.slot||chain.some(step=>step.holder===holder)){blocked=true;break}
      chain.push({holder,to:holderOld});wanted=holderOld;
    }
    if(blocked)continue;
    for(const {holder} of chain){placed.splice(placed.indexOf(holder),1);occupied[holder.station].delete(holder.slot)}
    for(const {holder,to} of chain){const {station:_station,slot:_slot,built:_built,...holderUnit}=holder;claim(holderUnit,to.station,to.slot)}
    overflow.splice(index,1);claim(item.unit,old.station,old.slot);
  }
  const stablePlaced=stabiliseProjectedPlacements(baseP,placed),rebirthPick=stablePlaced.reduce((map,x)=>{const previous=map.get(x.name),key=`${x.source}:${x.unit}`;if(!previous||variantRank(x.variant)>variantRank(previous.variant))map.set(x.name,{variant:x.variant,key});return map},new Map()),finalPlaced=[],finalSell=[...sell];
  // Upgrade Chip counts as producing here: a droid making chips is earning its
  // slot even with no rebirth use, so it is exempt from the unused sell pass.
  for(const x of stablePlaced){
    const key=`${x.source}:${x.unit}`,d=state.droids.find(y=>y.name===x.name),producing=PRODUCTIVE_STATIONS.includes(x.station)||isProtocolStation(x.station)||x.station==='UPGRADE_CHIP',status=d?droidCycleStatus(d,x.variant,rebirthPick.get(x.name)?.key===key):{kind:'unused'};
    // Why a droid is being kept, so the plan can say Rebirth or Droidex rather
    // than leaving you to guess.
    const companionDetail=companionKept.get(key)||missionKept.get(key)||(x.companionActivity?`Companion · ${COMPANION_ACTIVITIES[companionActivity()]?.label.toLowerCase()||'activity'}`:undefined),handDetail=keptByHand.get(key),keepDetail=droidexKeptKeys.get(key);
    const reason=x.keepReason==='fusion'?{keepReason:'fusion',keepDetail:'Kept for fusion - waiting for a matching batch'}:companionDetail?{keepReason:'companion',keepDetail:companionDetail}:handDetail?{keepReason:'manual',keepDetail:handDetail}:keepDetail?{keepReason:'droidex',keepDetail}:producing||status.kind!=='unused'?{keepReason:'rebirth',keepDetail:status.label}:{};
    const keep={...x,...reason,...(isBuilding(x)?{keepReason:'building',keepDetail:'Still being built · cannot be moved yet'}:{})};
    if(!producing&&status.kind==='unused'&&!isIconic(d)&&!x.lockedSlot&&!keepDetail&&!companionDetail&&!handDetail&&x.keepReason!=='fusion'&&!keepForFusion(x)&&!isBuilding(x))finalSell.push({...x,sellReason:status.label});else finalPlaced.push(keep);
  }
  if(keepBuildOpen&&optimiseFreeBuildMode()==='unused-income')finalSell.sort((a,b)=>{const ad=state.droids.find(d=>d.name===a.name),bd=state.droids.find(d=>d.name===b.name);return(ad?.variants[a.variant]?.income||0)-(bd?.variants[b.variant]?.income||0)});
  const rows=optimisedRows(finalPlaced,overflow);
  return{placed:finalPlaced,overflow,sell:finalSell,rows,fusing}
}
async function collectOptimiseFusionResults(projected){
  const pending=(projected.fusionResults||[]).filter(u=>u.fusionUnknown),picked=[];
  for(const [index,result] of pending.entries()){
    const choice=await new Promise(resolve=>{
      const root=document.querySelector('#modalRoot');let settled=false;
      const finish=value=>{if(settled)return;settled=true;observer.disconnect();resolve(value)};
      const observer=new MutationObserver(()=>{if(!root.querySelector('#fusionResultCancel'))finish(null)});
      showFusionResultPrompt(result.fusionInputs.map(u=>u.name),finish,{kind:'rarity',rarity:result.rarity,variant:result.variant});
      root.querySelector('.eyebrow').textContent=`Optimise · Fusion result ${index+1} of ${pending.length}`;
      root.querySelector('.picker-hint').textContent=`Which ${rarityLabel(result.rarity)} droid did you get at ${variantLabel(result.variant)}? It will be saved in Fusion Build ${result.slot+1}. Nothing is applied until all results are selected. Cancel if you have not completed this fusion.`;
      observer.observe(root,{childList:true,subtree:true});
    });
    if(!choice)return false;
    picked.push({...result,name:choice.name,variant:choice.variant,fusionUnknown:false});
  }
  projected.placed.push(...picked);
  projected.rows=optimisedRows(projected.placed,projected.overflow);
  return true;
}
async function applyOptimisedLayout(preview){
  if(state.sharedView&&!state.sharedView.canEdit)return toast('This shared profile is read only');
  const candidate=preview?.projected?preview:backgroundOptimisePreview();
  if(!candidate)return toast('Optimise is still calculating. Wait for the route before applying.');
  if(candidate.inputStamp!==optimiseInputStamp())return toast('Your Base or settings changed. Regenerate Optimise before applying.');
  const projected=structuredClone(candidate.projected);
  if(!projected.planComplete)return toast(projected.planIssues?.[0]||'Regenerate Optimise before applying this layout');
  if(projected.partial&&!confirm(projected.partialMessage))return;
  const consumed=candidate.steps?.filter(s=>s.type==='fuse').flatMap(s=>fusionTraitInputs(s,candidate.baseP?.placed))||[];
  const fusionWarning=traitLossText(consumed);if(fusionWarning&&!confirm(fusionWarning+'Continue with the planned fusions?'))return;
  if(projected.sell.length&&!confirm(`${traitLossText(projected.sell)}Apply this layout and remove ${projected.sell.length} droid${projected.sell.length===1?'':'s'} from Sell?`))return;
  const previousOwned=state.owned,previousUnlocks=state.novaIconicUnlocks;
  if(!await collectOptimiseFusionResults(projected))return;
  if(state.owned!==previousOwned||candidate.inputStamp!==optimiseInputStamp())return toast('Your Base or settings changed while selecting fusion results. Regenerate Optimise before applying.');
  state.owned=projected.rows;
  state.novaIconicUnlocks=normaliseNovaIconicUnlocks([...state.novaIconicUnlocks,...(projected.returns||[]).map(u=>u.name)]);
  clearOptimiseMarks();
  if(state.sharedView){
    save();
    try{
      await saveSharedProfileNow();
      location.hash='#/base';
      toast('Optimised layout applied and saved')
    }catch(error){
      state.owned=previousOwned;state.novaIconicUnlocks=previousUnlocks;
      state.sharedView.profile.data=profileDataFromState();
      toast(`Optimised layout was not saved: ${error.message}`)
    }
    return
  }
  save();location.hash='#/base';toast(projected.partial?'Steps applied. Open Optimise again for the remaining moves.':'Optimised layout applied')
}
const unitName=x=>`${x.name} ${variantText(x.variant)}`;
// Selling and moving read alike at a glance, and mistaking one for the other
// costs you a droid, so the opening verb is colour-coded: red to sell, amber to
// shuffle into storage, green to put to work. Covers both planners' wording.
const STEP_VERB_TONE={Return:'stage',Buy:'place',Sell:'sell',Send:'stage',Move:'stage',Swap:'stage',Carry:'stage',Tell:'place',Make:'place',Put:'place'};
const FUSION_STEP_TYPES=['fuse-in','fuse-held','fuse-deferred','fuse-result','fuse'];
const stepTicked=text=>optimiseTickedSteps().includes(text);
function stepHtml(step,index){
  const d=state.droids.find(x=>x.name===step.unit?.name);
  // A step for the Fusion room gets its own colour, so sending a droid to be fused
  // never reads like sending it to storage.
  const toLounge=step.type==='move'&&(step.to==='LOUNGE'||step.to?.station==='LOUNGE');
  const tone=FUSION_STEP_TYPES.includes(step.type)?'fusion':toLounge?'lounge':STEP_VERB_TONE[String(step.text||'').split(' ')[0]];
  const text=tone?String(step.text).replace(/^(\S+)/,`<b class="step-verb verb-${tone}">$1</b>`):step.text;
  const ticked=stepTicked(optimiseStepKey(step));
  const tick=step.type==='note'?'':`<label class="step-tick" title="Mark this step as done"><input type="checkbox" data-step-tick="${escapeAttr(optimiseStepKey(step))}" ${ticked?'checked':''}><span></span></label>`;
  // Sell steps can be waved off: the droid is spared and the plan recomputed.
  // unitName() returns markup, so it cannot go in an attribute — its quotes end
  // the attribute early and the rest spills onto the page as text.
  const skip=['sell','return'].includes(step.type)&&step.unit?`<button class="step-skip" data-skip-sell="${step.unit.source}:${step.unit.unit}" title="${escapeAttr(`Keep ${plainUnitName(step.unit)} and work out the plan again`)}">Keep</button>`:'';
  // Following a plan is the cheapest way to gather slot-choice data, so each
  // send-to-work step can record where the droid actually ended up.
  const free=step.freeSlots||[];
  const options=free.map(spot=>`<option value="${spot.station}:${spot.slot}" ${slotLogSame(step.logged,spot)?'selected':''}>${stationSlotLabel(spot.station,spot.slot)}</option>`).join('');
  const record=(step.kind==='work'||step.to==='LOUNGE'||step.to?.station==='LOUNGE')&&!state.sharedView&&slotLogTracking()&&slotLabAllowed()&&free.length
    ?`<label class="step-record"><small>Landed in?</small><select data-log-step="${escapeAttr(step.text)}"><option value="">${free.length} it could take…</option>${options}</select></label>`
    :'';
  const checkpoint=step.checkpointAfter?`<span class="step-checkpoint"><button class="btn secondary" type="button" data-apply-through="${escapeAttr(optimiseStepKey(step))}">Apply steps up to this point</button><small>Done buying? Check the Lounge positions on your Base map, then continue Optimise.</small></span>`:'';
  return `${tick}<span class="step-thumb">${d?picture(d,step.unit.variant):''}</span><span class="step-text${toLounge?' step-to-lounge':''}">${text}</span>${record}${skip}${step.type==='sell'&&step.unit?`<button class="step-skip" data-reserve-fusion="${step.unit.source}:${step.unit.unit}" title="Keep all copies of this droid and quality for future fusion">Keep for fusion</button>`:''}${['fuse-in','fuse-held','fuse-deferred'].includes(step.type)&&step.unit?`<button class="step-skip" data-sell-instead="${step.unit.source}:${step.unit.unit}" title="${step.protocolSpare?'Keep this reserved droid instead and recalculate the fusions':'Sell this droid instead and recalculate the fusions'}">${step.protocolSpare?'Keep':'Sell'}</button>`:''}${checkpoint}`;
}
function normaliseProjectedForSteps(baseP,projected){
  const keyOf=x=>`${x.source}:${x.unit}`,groupOf=x=>`${x.name}:${x.variant}`,cloneRows=rows=>(rows||[]).map(x=>({...x}));
  const placed=cloneRows(projected.placed),sell=cloneRows(projected.sell),overflow=cloneRows(projected.overflow);
  const fixed=new Set([...baseP.placed.filter(x=>x.lockedSlot||isBuilding(x)),...placed.filter(x=>x.lockedSlot||x.missionPriority||x.companionActivity||x.keepReason==='manual')].map(keyOf));
  const current=new Map(baseP.placed.map(x=>[keyOf(x),x]));
  for(const group of new Set(placed.map(groupOf))){
    // Identical unlocked copies can fill the same jobs. Keep protected copies
    // fixed, and preserve an existing occupant before choosing a duplicate to sell.
    const targets=placed.filter(x=>groupOf(x)===group&&!fixed.has(keyOf(x))&&current.has(keyOf(x)));
    const soldCopies=[...sell,...overflow].filter(x=>groupOf(x)===group&&!fixed.has(keyOf(x))&&current.has(keyOf(x)));
    if(targets.length+soldCopies.length<2)continue;
    const available=new Map([...targets,...soldCopies].map(x=>[keyOf(x),current.get(keyOf(x))])),matches=new Map();
    const match=(target,predicate)=>{const pick=[...available].find(([,x])=>predicate(x));if(pick){matches.set(target,pick[1]);available.delete(pick[0]);}};
    // Protect every exact match before assigning any floating destination.
    // Otherwise an earlier destination steals the copy already needed later.
    for(const target of targets)match(target,x=>x.station===target.station&&x.slot===target.slot);
    for(const target of targets)if(!matches.has(target))match(target,x=>x.station===target.station);
    for(const target of targets)if(!matches.has(target))match(target,x=>keyOf(x)===keyOf(target));
    for(const target of targets)if(!matches.has(target))match(target,()=>true);
    for(const sold of soldCopies)match(sold,x=>keyOf(x)===keyOf(sold));
    for(const sold of soldCopies)if(!matches.has(sold))match(sold,()=>true);
    for(const [target,unit] of matches){
      target.source=unit.source;target.unit=unit.unit;
      for(const field of ['built','preferred','preferredSlot']){
        if(Object.hasOwn(unit,field))target[field]=unit[field];else delete target[field];
      }
    }
  }
  for(const target of placed){const origin=current.get(keyOf(target));if(origin&&['BUILD','FUSION_BUILD'].includes(target.station)&&!isBuilding(origin))target.built=true;}
  return{...projected,placed,sell,overflow,fusing:cloneRows(projected.fusing)};
}

// ─── Route-aware step planner ───────────────────────────────────────────────
// In game you walk to the DROID and issue a command; the droid then routes
// itself to a slot. Group commands by where the droid currently stands. The
// simulator compares a grouped order with an ungrouped order, keeping a complete
// route with fewer stops; this is not an exhaustive shortest-route search.
//
// The command vocabulary is everything the game actually offers:
//   Work      — auto-routes: own type first, else the nearest credit slot,
//               Upgrade Chip last. Greyed out when no credit/chip slot is free.
//   Lounge    — its own option; never an auto-route destination.
//   Companion — swaps when the companion slots are full.
//   Sell
// Completed Build occupants can swap with compatible placed droids. An empty
// Build slot cannot be filled with an ordinary move; unfinished builds stay put.
const escapeAttr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// unitName() is markup for display; this is the same thing as plain text, for
// tooltips and anywhere else that must not contain tags.
const plainUnitName=x=>`${x.name} ${variantLabel(x.variant)}`;
// Ticking steps off is purely a visual aid, but a plan can take a few minutes to
// work through, so the ticks survive a reload. Keyed on the step wording, so
// they fall away by themselves once the plan changes.
const readList=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}};
const writeList=(key,list)=>{try{localStorage.setItem(key,JSON.stringify(list))}catch(e){}};
const optimiseTickedSteps=()=>readList('droid-archive-optimise-ticked');
const toggleTickedStep=key=>{const list=optimiseTickedSteps(),i=list.indexOf(key);i>=0?list.splice(i,1):list.push(key);writeList('droid-archive-optimise-ticked',list)};
// A step is the same step whatever its wording: the droid, the command and
// where it starts and ends.
const optimiseStepKey=step=>{const place=x=>x?typeof x==='string'?x:`${x.station}:${x.slot}`:'-';return `${step.type}|${step.unit?`${step.unit.source}:${step.unit.unit}`:'-'}|${place(step.from)}|${place(step.to)}`};
// Droids you have told Optimise to spare. Cleared when a layout is applied,
// since the keys are positions in the roster and those shift.
const sparedFromSelling=()=>readList('droid-archive-optimise-spared');
const spareFromSelling=key=>{const list=sparedFromSelling();if(!list.includes(key))list.push(key);writeList('droid-archive-optimise-spared',list)};
const soldInsteadOfFusion=()=>readList('droid-archive-optimise-sell-instead');
const sellInsteadOfFusion=key=>{const list=soldInsteadOfFusion();if(!list.includes(key))list.push(key);writeList('droid-archive-optimise-sell-instead',list)};
const clearOptimiseMarks=()=>{slotLogSession.clear();writeList('droid-archive-optimise-spared',[]);writeList('droid-archive-optimise-sell-instead',[]);writeList('droid-archive-optimise-ticked',[])};
const ROSTER='ROSTER';
const WORK_STATIONS=[...PRODUCTIVE_STATIONS,'UPGRADE_CHIP'];
const placeName=station=>station===ROSTER?'Roster':stationName(station);

// Consecutive steps issued at the same station are one stop on the walk round.
function optimiseVisits(steps){
  const visits=[];
  for(const step of steps){
    const last=visits[visits.length-1];
    if(last&&last.at===step.at&&last.visit===step.visit)last.steps.push(step);
    else visits.push({at:step.at,visit:step.visit,steps:[step]});
  }
  return visits;
}
// ─── Classic slot-by-slot planner ─────────────────────────────────
// Both display styles use the canonical simulator. Classic displays the steps
// as a list; route style groups the same commands into consecutive station visits.
const slotLabel=p=>p?`${stationName(p.station)} ${p.slot+1}${floorNote(p.station,p.slot)}`:'Roster';
// Which step style to show. Device-local like the other Optimise view prefs, not
// profile data — it changes how the same plan is presented, not the plan itself.
const OPTIMISE_STEP_STYLES=["route","classic"];
// A missing or blocked localStorage only resets the display preference; it must
// not prevent the shared plan from being shown.
const optimiseStepStyle=()=>{try{const saved=localStorage.getItem("droid-archive-optimise-step-style");return OPTIMISE_STEP_STYLES.includes(saved)?saved:"route"}catch(e){return"route"}};
// Plan batches from individual sell candidates, respecting per-copy Sell choices.
// Explicit fusion reserves are eligible alongside sell candidates. Accept the
// older Protocol keep reason too when processing an existing projected layout.
const protocolFusionSpares=projected=>[...(projected?.fusing||[]),...(projected?.placed||[]),...(projected?.overflow||[])].filter(x=>x.keepReason==='protocol'||x.keepReason==='fusion');
function fusionRebirthProtectedKeys(){
  const needed=new Set(futureRequirements().map(x=>x.droidName)),best=new Map();
  // Between equal copies the one at work is the rebirth copy, which leaves the
  // one in storage free to fuse.
  const stored=unit=>Number(!unit.preferred||['LOUNGE','FUSION','BUILD','FUSION_BUILD'].includes(unit.preferred));
  for(const unit of expandedOwned().sort((a,b)=>stored(a)-stored(b))){
    if(!needed.has(unit.name))continue;
    const previous=best.get(unit.name);
    if(!previous||variantRank(unit.variant)>variantRank(previous.variant))best.set(unit.name,unit);
  }
  // Below the required quality still means needed: keep the upgrade candidate.
  return new Set([...best.values()].map(x=>`${x.source}:${x.unit}`));
}
function optimiseFusionExcluded(baseP){
  const upgradeKeys=new Set((baseP?.placed||[]).filter(fusionReservedForUpgrade).map(x=>`${x.source}:${x.unit}`));
  // Replacing the required copy by the same droid at a higher variant is safe.
  // Only exact upgrade rules permit this; the scorer forbids all mixed uses.
  const excluded=new Set([...soldInsteadOfFusion(),...[...fusionRebirthProtectedKeys()].filter(key=>!upgradeKeys.has(key))]);
  for(const unit of baseP?.placed||[])if(unit.lockedSlot||isBuilding(unit))excluded.add(`${unit.source}:${unit.unit}`);
  return excluded;
}
function optimiseFusionReserves(projected){
  return [...new Map([...protocolFusionSpares(projected),...[...(projected?.placed||[]),...(projected?.overflow||[]),...(projected?.fusing||[])].filter(fusionReservedForUpgrade)].map(unit=>[`${unit.source}:${unit.unit}`,unit])).values()];
}
function optimiseFusionChain(projected,baseP){
  const excluded=optimiseFusionExcluded(baseP);
  const pool=[...new Map([...(projected?.sell||[]),...optimiseFusionReserves(projected)].map(unit=>[`${unit.source}:${unit.unit}`,unit])).values()];
  const spares=pool.filter(x=>!excluded.has(`${x.source}:${x.unit}`));
  // A kept droid on the table must be moved by the ordinary layout plan first. A
  // kept Protocol spare is the exception: it is there to be fused.
  const sellKeys=new Set(spares.map(x=>`${x.source}:${x.unit}`));
  if((baseP?.placed||[]).some(x=>x.station==='FUSION'&&!sellKeys.has(`${x.source}:${x.unit}`)))return[];
  // Three spares already on the table are a batch the player has staged. When
  // they fuse into something, that batch goes first and uses exactly them, so the
  // chain never plans a different batch around droids that are in its way.
  const staged=(baseP?.placed||[]).filter(x=>x.station==='FUSION'&&sellKeys.has(`${x.source}:${x.unit}`));
  const stagedBatch=staged.length===3?fusionBatchOf(staged,projected?.placed):null;
  if(!stagedBatch)return fusionChainFromSpares(spares,projected?.placed);
  const stagedKeys=new Set(staged.map(x=>`${x.source}:${x.unit}`));
  const rest=fusionChainFromSpares(spares.filter(x=>!stagedKeys.has(`${x.source}:${x.unit}`)),projected?.placed);
  return [{...stagedBatch,staged:true,step:1},...rest.map(step=>({...step,step:step.step+1,after:(step.after||[]).map(i=>i+1)}))];
}
// The fusion three given droids make, if any, judged like a chain step: how it
// compares with the weakest droid earning, and any Protocol bonus it brings.
function fusionBatchOf(units,placed){
  const stock=new Map();
  for(const unit of units){if(!stock.has(unit.name))stock.set(unit.name,new Map());const byVariant=stock.get(unit.name);byVariant.set(unit.variant,(byVariant.get(unit.variant)||0)+1)}
  const earning=(placed||[]).filter(x=>PRODUCTIVE_STATIONS.includes(x.station)).map(x=>droidIncomeAt(x.name,x.variant));
  const slots=PRODUCTIVE_STATIONS.reduce((total,type)=>total+capacity(type),0),floor=earning.length<slots?0:Math.min(...earning);
  // The player put them there, so the batch is offered whenever it is a fusion
  // at all; the floor only sets the gain the step reports.
  const pick=fusionBestFrom(stock,-Infinity,new Map(),null);
  if(!pick||pick.spend.reduce((sum,part)=>sum+part.count,0)!==3)return null;
  return {...pick,gain:pick.income-floor};
}
function withFusionSteps(steps,projected,baseP){
  if(state.optimiseFuseFirst===false)return steps;
  const chain=optimiseFusionChain(projected,baseP);
  if(!chain.length)return steps;
  const excluded=optimiseFusionExcluded(baseP),available=steps.filter(s=>s.type==='sell'&&s.unit&&!excluded.has(`${s.unit.source}:${s.unit.unit}`));
  // A kept Protocol spare has no sell step to turn into a fusion step, so it gets a
  // stand-in. If a fusion uses it, it is sent to Fusion; if not, it is simply kept
  // and never appears in the plan. It is fused from wherever it stands right now.
  for(const unit of optimiseFusionReserves(projected)){
    if(excluded.has(`${unit.source}:${unit.unit}`))continue;
    if(available.some(s=>s.unit.source===unit.source&&s.unit.unit===unit.unit))continue;
    const now=(baseP?.placed||[]).find(x=>x.source===unit.source&&x.unit===unit.unit)||(unit.station?unit:null);
    available.push({type:'protocol-spare',protocolSpare:true,unit,from:now?{station:now.station,slot:now.slot}:undefined,at:now?.station||'ROSTER',
      text:`Send ${unit.name} ${variantLabel(unit.variant)}${now?` from ${slotLabel(now)}`:''}.`});
  }
  const batches=[],claimed=new Set(),made=new Map();
  const keyOf=x=>`${x.name}|${x.variant}`,origin=s=>s.from?.station||s.from||s.unit?.station||s.at;
  for(const fusion of chain){
    const inputs=[],results=[];
    for(const part of fusion.spend){
      const key=keyOf(part),generated=Math.min(part.count,made.get(key)||0);
      made.set(key,(made.get(key)||0)-generated);
      if(generated)results.push({...part,count:generated});
      for(let n=generated;n<part.count;n++){
        // The first batch is the one the table serves, so it takes the copies that
        // are already there before any other: moving one on and an identical one
        // off is a command for nothing. A staged batch is wholly those droids.
        const input=(fusion.staged||!batches.length?available.find(s=>!claimed.has(s)&&keyOf(s.unit)===key&&origin(s)==='FUSION'):null)||available.find(s=>!claimed.has(s)&&keyOf(s.unit)===key);
        if(!input)return steps; // Never offer a batch without all three inputs.
        claimed.add(input);inputs.push(input);
      }
    }
    if(fusion.out)made.set(keyOf(fusion.out),(made.get(keyOf(fusion.out))||0)+1);
    batches.push({fusion,inputs,results});
  }
  const onTable=available.filter(s=>origin(s)==='FUSION');
  // Inputs already on the table cannot be ignored while another batch runs.
  // Keep the original non-fusion plan when the batches cannot honor them. This
  // preserves explicit Keep choices and never silently consumes a later input.
  // Retrying only the sell pool left kept table inputs unchanged and could
  // recurse forever, while dropping baseP lost the table's real occupancy.
  const first=batches.findIndex(b=>b.inputs.some(s=>onTable.includes(s)));
  if(first>0||onTable.some(s=>claimed.has(s)&&!batches[0].inputs.includes(s))){
    return steps;
  }
  const out=steps.filter(s=>s.type==='sell'&&!claimed.has(s));
  batches.forEach(({fusion:step,inputs,results},index)=>{
    for(const result of results)out.push({type:'fuse-result',kind:'fuse-result',at:'FUSION',visit:`fusion-${index}`,unit:result,
      text:`Put ${result.count} \u00d7 ${result.name} ${variantLabel(result.variant)} from the earlier fusion result into Fusion for this batch.`});
    for(const input of inputs){
      const already=origin(input)==='FUSION';
      out.push({...input,type:already?'fuse-held':'fuse-in',kind:already?'fuse-held':'fuse-in',
        at:already?'FUSION':(input.at||origin(input)||'ROSTER'),to:'FUSION',visit:`fusion-${index}`,
        text:already?`Leave ${input.unit.name} ${variantLabel(input.unit.variant)} in Fusion for this batch.`:
          input.protocolSpare?`${input.text.replace(/[.]$/,'')} to the Fusion room.`:`${input.text.replace(/^Sell /,'Send ').replace(/\.\s*$/,'')} to the Fusion room instead of selling.`});
    }
    const spend=step.spend.map(part=>`${part.count} \u00d7 ${part.name} ${variantLabel(part.variant)}`).join(' + ');
    const rolled=rarityLabel(step.rarity);
    const makes=step.out?`${step.out.name} ${variantLabel(step.out.variant)}`:`${/^[aeiou]/i.test(rolled)?'an':'a'} ${rolled} droid at ${variantLabel(step.variant)}`;
    // Protocol droids roll into any type of droid, not only another Protocol one.
    const anyType=!step.sure&&step.spend.some(part=>fusionDroid(part.name)?.type==='PROTOCOL')?' It can be a Worker, Astromech, Battle or Protocol droid.':'';
    const why=step.staged?' These three are already on the table.':step.fills?' It is a Droidex square you do not have.':step.protocol&&step.bonusGain>0?' It gives a stronger Protocol bonus than the weakest one in your slots.':step.gain>0?` ${step.sure?'It':'The typical result'} out-earns the weakest droid working, by about ${fmt(step.gain*3600)}/hr.`:' It advances your fusion goals and frees two spaces overall.';
    const waits=step.after.length?' Do this one after the fusion above, which makes the copy it needs.':'';
    const roll=step.sure?'':' Which droid arrives is a roll.';
    out.push({type:'fuse',kind:'fuse',at:'FUSION',visit:`fusion-${index}`,fusion:step,
      unit:step.out?{name:step.out.name,variant:step.out.variant}:null,
      text:`Fuse ${spend}. This makes ${makes}.${why}${roll}${anyType}${waits} Collect the result and clear the table before the next batch.`});
  });
  return [...out,...steps.filter(s=>s.type!=='sell')];
}
// ─── Walking the base ──────────────────────────────────────────────────────
// The rooms a player walks between. Build slots and Protocol consoles stand in
// the region they serve, the Upgrade Chip pad is behind the Worker Build slot,
// and the Battle upstairs floor is a stop of its own.
const OPTIMISE_REGION_NAMES={ICONIC_SHOP:'Cantina',WORKER:'Worker room',ASTROMECH:'Astromech room',BATTLE:'Battle (downstairs)',BATTLE_UP:'Battle (upstairs)',LOUNGE:'Lounge',FUSION:'Fusion room',ANY:'Anywhere',ROSTER:'Roster'};
const optimiseRegion=(station,slot)=>station==='BATTLE'?(slot>=BATTLE_UPSTAIRS_FROM?'BATTLE_UP':'BATTLE'):station==='FUSION'||station==='FUSION_BUILD'?'FUSION':station==='UPGRADE_CHIP'?'WORKER':station==='BUILD'?PROTOCOL_REGIONS[slot]||'WORKER':station==='COMPANION'?null:PROTOCOL_SLOTS[station]?PROTOCOL_SLOTS[station].region:station;
const optimiseRegionName=region=>OPTIMISE_REGION_NAMES[region]||placeName(region);
// Horizontal centres of the captured slot groups estimate the player's travel
// between stops. These are not navigable paths or walking times. Droid landings
// use the separate full 3D slot distance, never this room-level estimate.
const OPTIMISE_REGION_XY=Object.fromEntries(Object.entries({WORKER:['WORKER',0,11],ASTROMECH:['ASTROMECH',0,9],BATTLE:['BATTLE',0,5],BATTLE_UP:['BATTLE',5,11],LOUNGE:['LOUNGE',0,13],FUSION:['FUSION',0,3]}).map(([region,[station,start,end]])=>{
  const points=Array.from({length:end-start},(_,i)=>slotPosition({station,slot:start+i}));
  return [region,[0,1].map(axis=>points.reduce((sum,p)=>sum+p[axis],0)/points.length)];
}));
// Where a droid overflows to when its own room is full, measured in-game from
// each room. A Worker droid took Battle over Astromech every time it was offered both.
const MEASURED_OVERFLOW_ORDER={WORKER:['BATTLE','ASTROMECH']};
const optimiseRegionDistance=(a,b)=>{if(a===b||a==='ANY'||b==='ANY')return 0;const p=OPTIMISE_REGION_XY[a],q=OPTIMISE_REGION_XY[b];return p&&q?Math.hypot(p[0]-q[0],p[1]-q[1]):0};
function optimiseRouteRules(){
  const droidOf=unit=>state.droids.find(d=>d.name===unit?.name);
  const rules={
    allowTemporaryCompanionSwaps:true,
    canReturn:unit=>Boolean(state.optimiseIncludeIconics&&isIconic(droidOf(unit))&&!unit.lockedSlot&&!isBuilding(unit)),
    canPurchase:unit=>Boolean(state.optimiseIncludeIconics&&isIconic(droidOf(unit))&&novaIconicUnlocked(unit.name)&&unit.variant==='DEFAULT'&&unit.built===true&&!unit.lockedSlot&&!state.owned.some(row=>row.name===unit.name&&row.qty>0)),
    slots:station=>stationSlotIndices(station),
    canUse:(unit,station)=>canUseStation(droidOf(unit),station)&&(station!=='UPGRADE_CHIP'||!isIconic(droidOf(unit))),
    isBuilding,
    typeOf:unit=>droidOf(unit)?.type||null,
    isMissionSlot:(station,slot)=>station==='ASTROMECH'&&ASTROMECH_MISSION_SLOTS.includes(slot),
    regionOf:optimiseRegion,
    distance:optimiseRegionDistance,
    slotDistanceSquared,
    nearestOrder:region=>MEASURED_OVERFLOW_ORDER[region]||null,
    // Iconics cannot stand on the Fusion table, so they cannot wait there.
    canPark:unit=>!isIconic(droidOf(unit)),
    protocolStations:()=>Object.keys(PROTOCOL_SLOTS).filter(station=>stationSlotIndices(station).length)
  };
  rules.companionWorkLanding=(unit,placed,target)=>predictCompanionWorkLanding(unit,placed,target,rules);
  rules.protocolCompanionLanding=(unit,placed,target)=>predictProtocolCompanionLanding(unit,placed,target,rules);
  rules.workLanding=(unit,placed)=>predictWorkLanding(unit,placed,rules);
  rules.stationLanding=(unit,placed,station)=>predictStationLanding(unit,placed,station,rules);
  return rules;
}
// Fusion batches the walk can perform now (all three inputs on the base and a
// Fusion Build slot to receive the result), and the ones that come afterwards.
function optimiseFusionBatches(baseP,projected,{arrange=false}={}){
  const keyOf=x=>`${x.source}:${x.unit}`,now=unit=>baseP.placed.find(x=>keyOf(x)===keyOf(unit));
  const sellSteps=projected.sell.map(unit=>{const here=now(unit);return {type:'sell',unit,from:here?{station:here.station,slot:here.slot}:undefined,at:here?.station||'ROSTER',text:`Sell ${unit.name} ${variantLabel(unit.variant)}${here?` from ${slotLabel(here)}`:''}.`}});
  const batches=[],later=[],claimed=new Set();
  let inputs=[],chained=false,index=0;
  for(const step of withFusionSteps(sellSteps,projected,baseP)){
    if(step.type==='fuse-in'||step.type==='fuse-held'){inputs.push(step.unit);claimed.add(keyOf(step.unit));}
    else if(step.type==='fuse-result')chained=true;
    else if(step.type==='fuse'){
      const out=step.fusion?.out;
      const resultUnit={source:`fusion-result-${index}`,unit:0,name:out?.name||'Fusion result',variant:out?.variant||step.fusion?.variant,fusionUnknown:!out,rarity:step.fusion?.rarity,fusionResult:true,fusionInputs:(step.fusion?.spend||[]).flatMap(part=>Array.from({length:part.count},()=>({name:part.name,variant:part.variant}))),built:false};
      (chained?later:batches).push({index,inputs,fusion:step.fusion,unit:step.unit,text:step.text,resultUnit});
      inputs=[];chained=false;index++;
    }
  }
  if(arrange&&batches.length){
    // Try the largest available prefix. Remove its three inputs per batch,
    // then reserve one tank per result. A finished tank occupant may move to
    // a Lounge space released by those inputs even with no income change.
    // The route solver must still prove the order of staging, moves and Fuse.
    for(let count=Math.min(batches.length,stationSlotIndices('FUSION_BUILD').length);count>0;count--){
      const consumed=new Set(batches.slice(0,count).flatMap(batch=>batch.inputs.map(keyOf)));
      const placed=projected.placed.filter(unit=>!consumed.has(keyOf(unit))).map(unit=>({...unit}));
      const openTanks=()=>stationSlotIndices('FUSION_BUILD').filter(slot=>!placed.some(unit=>unit.station==='FUSION_BUILD'&&unit.slot===slot));
      for(const unit of placed.filter(unit=>unit.station==='FUSION_BUILD')){
        if(openTanks().length>=count)break;
        const origin=now(unit);
        if(!origin?.built||origin.lockedSlot||unit.lockedSlot)continue;
        const slot=stationSlotIndices('LOUNGE').find(slot=>!placed.some(other=>other.station==='LOUNGE'&&other.slot===slot));
        if(slot===undefined||!canUseStation(fusionDroid(unit.name),'LOUNGE'))continue;
        unit.station='LOUNGE';unit.slot=slot;
      }
      if(openTanks().length<count)continue;
      projected.fusing=[...new Map([...(projected.fusing||[]),...batches.slice(0,count).flatMap(batch=>batch.inputs)].map(unit=>[keyOf(unit),{...unit,keepReason:'fusion'}])).values()];
      projected.placed=placed;
      projected.overflow=projected.overflow.filter(unit=>!consumed.has(keyOf(unit)));
      while(batches.length>count)later.unshift(batches.pop());
      break;
    }
  }
  // A result needs a Fusion Build slot: free now, or holding a finished droid
  // that this layout really sends somewhere else. One the layout leaves in its
  // tank (nowhere better to go) keeps the tank.
  const leavesTank=occupant=>{const goal=projected.placed.find(x=>keyOf(x)===keyOf(occupant));return !goal||goal.station!=='FUSION_BUILD'};
  const capacity=stationSlotIndices('FUSION_BUILD').filter(slot=>{const occupant=baseP.placed.find(x=>x.station==='FUSION_BUILD'&&x.slot===slot);if(projected.placed.some(x=>x.station==='FUSION_BUILD'&&x.slot===slot&&(!occupant||keyOf(x)!==keyOf(occupant))))return false;return !occupant||occupant.built&&!occupant.lockedSlot&&leavesTank(occupant)}).length;
  while(batches.length>capacity)later.unshift(batches.pop());
  return {batches,later,claimed};
}
// The sentence the player reads for one command of the walk.
function routeStepText(step){
  const who=step.unit?`${unitName(step.unit)}${step.from?` in ${slotLabel(step.from)}`:''}`:'';
  if(step.type==='buy'){
    const cost=state.droids.find(d=>d.name===step.unit.name)?.variants?.DEFAULT?.cost;
    return `At the Cantina, buy ${unitName(step.unit)}${Number.isFinite(cost)&&cost>0?` for ${fmt(cost)} credits`:''} from its unlocked Iconic offer. It follows you in Companion ${step.to.slot+1}; keep that seat free before buying.`;
  }
  if(step.type==='return')return `Return ${who} using Return on its droid card. Its unlock stays available at the Cantina; this frees its Base slot.`;
  if(step.type==='sell')return escapeAttr(traitLossText(step.unit?[step.unit]:[]))+`Sell ${who}.`;
  if(step.type==='fuse-in')return `Send ${who} to the Fusion room.`;
  if(step.type==='fuse-held')return `Leave ${unitName(step.unit)} in Fusion for this batch.`;
  if(step.type==='fuse')return escapeAttr(traitLossText(fusionTraitInputs(step)))+String(step.text||'').replace(/\s*Collect the result and clear the table before the next batch\.?\s*$/,'')+` The result builds in Fusion Build ${Number(step.toSlot)+1} until it finishes.`;
  if(step.type==='swap'&&step.kind==='companion-swap')return `Open the card of ${who} and press Swap, Slot ${Number(step.withFrom?.slot)+1}: it becomes your companion and ${unitName(step.withUnit)} takes its place in ${slotLabel(step.from)}.`;
  if(step.type==='move'){
    const to=step.to||{};
    if(to.station==='LOUNGE')return `Send ${who} to the Lounge${step.buffer?' for now':''} &mdash; destination: ${slotLabel(to)}. Wait for it to arrive.`;
    if(to.station==='FUSION')return `Send ${who} to the Fusion room for now &mdash; destination: ${slotLabel(to)}. Wait for it to arrive.`;
    if(to.station==='COMPANION')return `Make ${who} your companion.`;
    const where=to.station==='UPGRADE_CHIP'?'the Upgrade Chip station':isProtocolStation(to.station)?stationName(to.station):`${slotLabel(to)}${to.station==='ASTROMECH'?` (${to.cls==='mission'?'mission':'credit'} slot)`:''}`;
    if(step.approachSlot||step.approachProtocol)return `With ${unitName(step.unit)} as your companion, walk right beside ${where}. Wait for the droid to follow you there, then tell it to go to work. Keep that slot free until it arrives.`;
    return `Tell ${who} to go to work &mdash; destination: ${where}. Wait for it to arrive.`;
  }
  return step.text||'';
}
const optimiseMovementRules=()=>optimiseRouteRules();
function resolveOptimiseProjection(projected,moves){
  const keyOf=x=>`${x.source}:${x.unit}`;
  // The route reports each goal from the base copy, which carries no keep reason;
  // merge, so the reason the layout gave a droid survives its resolved position.
  const details=new Map();
  for(const x of [...(projected.overflow||[]),...(projected.placed||[]),...(moves.resolvedGoals||[])])details.set(keyOf(x),{...(details.get(keyOf(x))||{}),...x});
  const actual=(moves.finalPlaced||[]).map(unit=>({...details.get(keyOf(unit)),...unit,...(unit.fusionResult?{lockedSlot:false}:{})}));
  const held=new Set(actual.map(keyOf));
  projected.placed=actual.filter(x=>!x.fusionUnknown);
  projected.fusionResults=actual.filter(x=>x.fusionResult);
  projected.overflow=(projected.overflow||[]).filter(x=>!held.has(keyOf(x)));
  projected.rows=optimisedRows(projected.placed,projected.overflow);
}
function safeOptimiseStepPlan(baseP,projected,computedRoute=null){
  const keyOf=x=>`${x.source}:${x.unit}`;
  const fail=(message,steps=[])=>{
    projected.planComplete=false;projected.planIssues=[message];
    return steps.some(step=>step.type==='note')?steps:[...steps,{type:'note',at:steps.at(-1)?.at||'ANY',visit:steps.at(-1)?.visit,planBlocked:true,text:message}];
  };
  try{
    Object.assign(projected,normaliseProjectedForSteps(baseP,projected));
    const rules=optimiseRouteRules();
    // Fusion batches whose three inputs stand on the base now are part of the
    // walk; ones that wait for an earlier result come afterwards. Inputs kept
    // for a later batch are not sold.
    const {batches,later,claimed}=optimiseFusionBatches(baseP,projected,{arrange:true});
    const sell=projected.sell.filter(unit=>!claimed.has(keyOf(unit)));
    const route=computedRoute||planOptimiseRoute({initial:baseP,target:{placed:projected.placed,sell,returns:projected.returns||[],overflow:projected.overflow,fusions:batches},rules});
    let steps=route.steps.map(step=>({...step,text:routeStepText(step)}));
    projected.later=[...later,...route.later.map(entry=>entry.batch)];
    projected.routeStops=route.stops;projected.routeAssumed=route.assumed;
    if(!route.complete)return fail(route.issues[0]||'Optimise could not find a walk that reaches this layout.',steps);
    resolveOptimiseProjection(projected,route);
    projected.sell=sell;
    projected.fusedInputs=batches.filter(batch=>route.fused.includes(batch.index)).reduce((sum,batch)=>sum+batch.inputs.length,0);
    const shorter=computedRoute?{steps,stops:route.stops,travelDistance:route.travelDistance}:shortenOptimiseWalk(steps,{distance:rules.distance,slotDistanceSquared:rules.slotDistanceSquared,isValid:candidate=>validateOptimisePlan({initial:baseP,projected,steps:candidate,rules}).ok});
    steps=shorter.steps;projected.routeStops=shorter.stops;projected.routeTravelDistance=shorter.travelDistance;
    const validation=validateOptimisePlan({initial:baseP,projected,steps,rules});
    projected.planComplete=validation.ok;projected.planIssues=validation.issues;
    if(!validation.ok){console.warn('Optimise plan validation failed',validation.issues);return fail('These moves could not be verified against your Base. No layout will be applied; update the Base and regenerate Optimise.',steps);}
    return steps;
  }catch(error){
    console.warn('Optimise step plan unavailable',error);
    return fail('Optimise could not finish a safe move sequence. Your Base has not changed.');
  }
}
function optimiseInputStamp(){const {eventProgress,...plannerData}=profileDataFromState();return JSON.stringify({profile:state.cloud?.activeProfileId,shared:state.sharedView?.profile?.id,data:plannerData,spared:sparedFromSelling(),soldInstead:soldInsteadOfFusion(),landings:slotSessionRead().entries,activity:companionActivity()});}
// The page re-renders on every tick and toggle; the plan only changes when the
// base or the settings behind it do, so the last preview is kept by its stamp.
let optimisePreviewCache=null;
let optimiseBackgroundJob=null,optimiseBackgroundStatus='idle',optimiseDisplayedPreview=null,optimiseBackgroundRender=false;
function renderBackgroundOptimise(){
  optimiseBackgroundRender=true;
  if(location.hash.split('?')[0]!=='#/optimise'||document.querySelector('#modalRoot')?.children.length||document.activeElement?.matches('input,select,textarea'))return;
  optimiseBackgroundRender=false;optimisePage();
}
const optimiseBackground=createOptimiseBackground({
  createWorker:()=>new Worker(new URL('./optimise-worker.js?v=2026-11-01-scourge-protocol',import.meta.url),{type:'module'}),
  onStatus:status=>{optimiseBackgroundStatus=status;setTimeout(renderBackgroundOptimise,0)},
  onProgress:(message,stamp)=>{if(stamp===optimiseInputStamp()&&optimiseBackgroundJob?.stamp===stamp){if(message.progress)optimiseBackgroundJob.progress=message.progress;if(message.issues)optimiseBackgroundJob.issues=message.issues;renderBackgroundOptimise();}},
  onPrepared:(message,stamp)=>{if(stamp===optimiseInputStamp()&&optimiseBackgroundJob?.stamp===stamp)Object.assign(optimiseBackgroundJob,message.prepared);},
  onResult:(message,stamp)=>{
    if(stamp!==optimiseInputStamp()||optimiseBackgroundJob?.stamp!==stamp)return;
    const {baseP,plan,targets}=optimiseBackgroundJob;if(!targets)return;
    const projected=structuredClone(targets[message.index]);
    const recommendations=optimiseBackgroundJob.recommendations??=new Map();
    if(message.iconicOptions)recommendations.set(message.index,message.iconicOptions);
    projected.iconicOptions=recommendations.get(message.index);
    const steps=safeOptimiseStepPlan(baseP,projected,message.route);
    if(!projected.planComplete)return;
    const preview=finishOptimisePreview(baseP,plan,projected,steps,stamp);
    optimisePreviewCache={stamp,preview};renderBackgroundOptimise();
  }
});
// Pure preparation also feeds the isolated layout worker. Keep it free of UI,
// profile writes and account state; the generated worker context shares these rules.
function prepareOptimiseWorkerJob(progress){
  const prepared=prepareOptimiseLayout(undefined,progress),{baseP,plan}=prepared,targets=[];
  let projected=prepared.projected;
  while(projected){targets.push(structuredClone(projected));projected=projected.fallback;}
  const rules=optimiseRouteRules(),stations=Object.keys(SLOT_RULES),slots=Object.fromEntries(stations.map(s=>[s,rules.slots(s)]));
  const regions=Object.fromEntries(stations.flatMap(s=>slots[s].map(slot=>[`${s}:${slot}`,rules.regionOf(s,slot)])));
  const rooms=[...new Set(Object.values(regions).filter(Boolean)),'ANY','ICONIC_SHOP'];
  const ruleData={returnable:[...baseP.placed,...(baseP.overflow||[])].filter(rules.canReturn).map(unit=>unit.name),purchasable:(baseP.purchases||[]).filter(rules.canPurchase).map(unit=>unit.name),allowTemporaryCompanionSwaps:rules.allowTemporaryCompanionSwaps,slots,regions,protocol:rules.protocolStations(),missions:Object.fromEntries(stations.map(s=>[s,slots[s].filter(slot=>rules.isMissionSlot(s,slot))])),
    distances:Object.fromEntries(rooms.map(a=>[a,Object.fromEntries(rooms.map(b=>[b,rules.distance(a,b)]))])),
    droids:Object.fromEntries(state.droids.map(d=>[d.name,{type:d.type,canPark:rules.canPark({name:d.name}),allowed:stations.filter(s=>rules.canUse({name:d.name},s))}]))};
  const workerTargets=targets.map(target=>{
    Object.assign(target,normaliseProjectedForSteps(baseP,target));
    const {batches,claimed}=optimiseFusionBatches(baseP,target,{arrange:true});
    return {placed:target.placed,returns:target.returns||[],sell:target.sell.filter(u=>!claimed.has(`${u.source}:${u.unit}`)),overflow:target.overflow,fusions:batches};
  });
  return {baseP,plan,targets,snapshot:{initial:baseP,targets:workerTargets,rules:ruleData}};
}
function optimiseLayoutSnapshot(){
  return {state:{...profileDataFromState(),droids:state.droids,rebirths:state.rebirths,fusion:state.fusion},
    storage:Object.fromEntries(['droid-archive-companion-activity','droid-archive-optimise-spared','droid-archive-optimise-sell-instead'].map(key=>[key,localStorage.getItem(key)])),
    variants:VARIANTS,displayVariants:DISPLAY_VARIANTS,kyberPreviewVerified,craftingEventMultiplier};
}
function refreshBackgroundOptimise(extended=false){
  if(!state.droids.length)return;
  const stamp=optimiseInputStamp();
  if(optimiseBackgroundJob?.stamp===stamp)return;
  optimiseBackground.cancel();optimiseDisplayedPreview=null;
  if(optimisePreviewCache?.stamp!==stamp)optimisePreviewCache=null;
  optimiseBackgroundJob={stamp};
  // Only copy inputs here. Both layout comparisons and route search run in the
  // cancellable worker, so a Base edit never starts a long main-thread task.
  optimiseBackground.update(stamp,{layout:optimiseLayoutSnapshot()},{budget:extended?180000:45000});
}
function backgroundOptimisePreview(){
  refreshBackgroundOptimise();const stamp=optimiseInputStamp();
  if(optimiseDisplayedPreview?.inputStamp===stamp&&optimiseTickedPrefix(optimiseDisplayedPreview).count)return optimiseDisplayedPreview;
  const preview=optimisePreviewCache?.stamp===stamp?optimisePreviewCache.preview:null;
  if(preview)optimiseDisplayedPreview=preview;
  return preview;
}
// Catches profile/cloud changes and companion activity that do not call save.
// An unchanged snapshot never restarts a completed or budget-limited search.
setInterval(()=>{refreshBackgroundOptimise();if(optimiseBackgroundRender)renderBackgroundOptimise()},1000);
function createOptimisePreview(baseP,plan){
  const cacheable=!baseP&&!plan,stamp=cacheable?optimiseInputStamp():null;
  if(cacheable&&optimisePreviewCache?.stamp===stamp)return optimisePreviewCache.preview;
  const prepared=plan?{baseP:baseP||placements(),plan,projected:optimisedPlacements(baseP||placements(),plan)}:prepareOptimiseLayout(baseP);
  ({baseP,plan}=prepared);
  let projected=prepared.projected,steps=safeOptimiseStepPlan(baseP,projected);
  // A layout that leans on fusion or Companion swaps may still be one no order
  // of commands reaches. Rather than show a broken walk, fall back to the
  // plainer layout it improved on, as long as that one can be walked.
  for(let fallback=projected.fallback;fallback&&!projected.planComplete;fallback=fallback.fallback){
    const altSteps=safeOptimiseStepPlan(baseP,fallback);
    if(fallback.planComplete){projected=fallback;steps=altSteps;break;}
  }
  const preview=finishOptimisePreview(baseP,plan,projected,steps,stamp||optimiseInputStamp());
  if(cacheable)optimisePreviewCache={stamp,preview};
  return preview;
}
function finishOptimisePreview(baseP,plan,projected,steps,stamp){
  annotateLogSlots(steps);
  // A measured different landing changes the starting state of every later
  // command. Never silently swap preview occupants to fit a recorded result.
  if(steps.some(step=>step.logged&&!slotLogSame(step.logged,typeof step.to==='string'?{station:step.to,slot:step.toSlot}:step.to))){
    projected.planComplete=false;projected.planIssues=['Update Base with the recorded landing, then regenerate Optimise.'];
    steps.push({type:'note',at:'ANY',planBlocked:true,text:projected.planIssues[0]});
  }
  if(projected.planComplete&&baseP.purchases?.length){
    const lastBuy=steps.findLastIndex(step=>step.type==='buy');
    // Save a purchase checkpoint only after the reserved Companions are back.
    // The Base map can then correct guessed Lounge landings before replanning.
    for(let i=lastBuy;i>=0&&i<steps.length-1;i++){
      const replay=validateOptimisePlan({initial:baseP,projected:{placed:[],sell:[]},steps:steps.slice(0,i+1),rules:optimiseMovementRules()});
      if(replay.companionsRestored&&baseP.purchases.every(u=>replay.placed.some(v=>v.source===u.source&&v.unit===u.unit&&(v.station!=='COMPANION'||projected.placed.some(goal=>goal.source===u.source&&goal.unit===u.unit&&goal.station==='COMPANION'))))){steps[i].checkpointAfter=true;break;}
    }
  }
  return {baseP,plan,projected,steps,inputStamp:stamp,currentIncome:incomeForPlaced(baseP.placed),income:incomeForPlaced(projected.placed)};
}
// A tick means "done in-game". Ticks are read as a prefix of the walk — up to
// the last ticked step — and the Base after that prefix is replayed from the
// same rules the validator uses, so it can be applied on its own.
function optimiseTickedPrefix(preview){
  const steps=preview.steps.filter(step=>step.type!=='note'),ticked=new Set(optimiseTickedSteps());
  let count=0;steps.forEach((step,index)=>{if(ticked.has(optimiseStepKey(step)))count=index+1});
  return {count,total:steps.length,steps:steps.slice(0,count)};
}
function optimiseTickedProjection(preview,through){
  const keyOf=x=>`${x.source}:${x.unit}`,all=preview.steps.filter(step=>step.type!=='note'),prefix=Number.isInteger(through)?{count:through,total:all.length,steps:all.slice(0,through)}:optimiseTickedPrefix(preview);
  if(!prefix.count||prefix.count>=prefix.total)return null;
  const replay=validateOptimisePlan({initial:preview.baseP,projected:{placed:[],overflow:[],sell:[]},steps:prefix.steps,rules:optimiseMovementRules()});
  if(replay.companionsRestored===false)return null;
  const placed=replay.placed.map(unit=>({...unit,...(unit.fusionResult?{lockedSlot:false}:{})}));
  const sold=prefix.steps.filter(step=>step.type==='sell').map(step=>step.unit),returns=prefix.steps.filter(step=>step.type==='return').map(step=>step.unit);
  const fused=new Set(prefix.steps.filter(step=>step.type==='fuse').flatMap(step=>step.inputs||[]));
  // Inputs sent to the Fusion room but not fused yet are still on the table.
  const tableFree=stationSlotIndices('FUSION').filter(slot=>!placed.some(x=>x.station==='FUSION'&&x.slot===slot));
  for(const step of prefix.steps.filter(step=>['fuse-in','fuse-held'].includes(step.type)&&!fused.has(keyOf(step.unit)))){
    const slot=tableFree.shift();if(slot!==undefined)placed.push({...step.unit,station:'FUSION',slot});
  }
  const held=new Set([...placed.map(keyOf),...sold.map(keyOf),...returns.map(keyOf),...fused]);
  const overflow=[...(preview.baseP.overflow||[]),...preview.baseP.placed].filter(unit=>!held.has(keyOf(unit)));
  const known=placed.filter(unit=>!unit.fusionUnknown);
  const income=incomeForPlaced(known);
  return {placed:known,fusionResults:placed.filter(unit=>unit.fusionResult),sell:sold,returns,overflow,rows:optimisedRows(known,overflow),planComplete:true,planIssues:[],partial:true,
    tickedCount:prefix.count,tickedTotal:prefix.total,income,
    partialMessage:`Apply the first ${prefix.count} of ${prefix.total} steps? Your Base will then earn ${fmt(income*3600)}/hr${income<preview.currentIncome*0.999?` — ${fmt((preview.currentIncome-income)*3600)}/hr less than now until you finish the walk`:''}.`};
}
function critCalcPage(){
  const render=()=>{
    const placed=placements().placed;
    const autoAstro=companionAstromechBonus(placed),autoChopper=placed.some(x=>x.station==='COMPANION'&&x.name==='CHOPPER');
    const masteryFloor=pickaxeMasteryLevels();
    // The three perk levels are the real Nova Shop values, edited in place, so
    // this and the Nova Shop page never disagree. Only the pickaxe, companion
    // and Chopper inputs are local to the calculator.
    const current={
      chanceLevel:novaLevelFor(CRIT_UPGRADE_IDS.chance),
      amountLevel:novaLevelFor(CRIT_UPGRADE_IDS.amount),
      multiLevel:novaLevelFor(CRIT_UPGRADE_IDS.multi),
      chopper:Boolean(critSetting('chopper',autoChopper?1:0)),
      pickaxe:critSetting('pickaxe',masteryFloor),
      // Read straight off the Base rather than typed in — whatever Astromech is
      // in your Companion slot is the answer.
      astromech:autoAstro,
      boost:Math.max(1,critSetting('boost',1)),
      partyMultiplier:partyBonuses(state.party).pickaxe,traitChance:traitSum(placed,4),traitAmountBonus:traitSum(placed,5),traitMulti:traitSum(placed,18),
    };
    // What each perk has cost you so far, and what the next rank adds.
    const spent=id=>{const u=novaUpgrade(id);return u?novaTotalCost(u,novaLevelFor(id)):0};
    const totalSpent=Object.values(CRIT_UPGRADE_IDS).reduce((s,id)=>s+spent(id),0);
    const p=critProfile(current),options=critUpgradeOptions(current),best=options.find(o=>!o.locked);
    // Rebirth crit perks are not bought, so they are shown as a read-out beside
    // the Nova levels rather than as another thing to step up and down.
    const rebirthBonus=rebirthCritBonus(),nextCritPerk=rebirthCritPerks({after:state.rebirth})[0];
    const num=(id,label,value,max,hint)=>`<label class="crit-field"><span>${label}</span><input type="number" id="${id}" value="${value}" min="0" ${max?`max="${max}"`:''} step="1"><small>${hint}</small></label>`;
    // Nova perks get plus and minus buttons so levels can be pushed from here
    // rather than switching to the Nova Shop and back.
    const perk=(id,key,label,level,detail)=>{
      const max=novaMaxLevel(id),next=level<max?novaLevelCost(id,level+1):null;
      return `<div class="crit-field crit-perk"><span>${label}</span><div class="crit-step"><button class="btn secondary" data-perk-down="${id}" ${level<=0?'disabled':''}>−</button><input type="number" id="${key}" value="${level}" min="0" ${Number.isFinite(max)?`max="${max}"`:String()} step="1"><button class="btn secondary" data-perk-up="${id}" ${level>=max?'disabled':''}>+</button></div><small>${detail} · level ${level}${Number.isFinite(max)?`/${max}`:" · unlimited"}</small><small class="crit-cost">Spent ${fmt(spent(id))} Nova${next?` · next rank ${fmt(next)}`:' · maxed'}</small></div>`;
    };
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Critical Calculator</div>
      <div class="base-heading"><div><p class="eyebrow">Pickaxe planner</p><h1>Critical Calculator</h1><p class="lead">What your pickaxe removes per swing, and which Nova crit upgrade is the best next buy.</p></div><button class="btn secondary" id="critReset">Reset to my Nova levels</button></div>
      <div class="party-toggle-bar">${partyToggleButtonHtml()}</div>${partyControlsHtml()}<section class="crit-inputs">
        ${perk(CRIT_UPGRADE_IDS.chance,'critChance','Critical Chance',current.chanceLevel,`now ${(p.chance*100).toFixed(0)}% chance`)}
        ${perk(CRIT_UPGRADE_IDS.amount,'critAmount','Critical Amount',current.amountLevel,`crits do ×${(1+p.amount).toFixed(2)}`)}
        ${perk(CRIT_UPGRADE_IDS.multi,'critMulti','Multi Crit',current.multiLevel,`${p.rolls} crit roll${p.rolls===1?'':'s'} in total`)}
        ${num('critPickaxe','Pickaxe level',current.pickaxe,0,masteryFloor?`Pickaxe Mastery keeps ${masteryFloor}`:'Set Pickaxe Mastery in Nova Shop')}
        <div class="crit-field"><span>Astromech companion</span><div class="crit-readout">${autoAstro?`+${autoAstro}`:'—'}</div><small>${autoAstro?`From your Base · effective level ${current.pickaxe+autoAstro}`:'No Astromech in a Companion slot'}</small></div>
        <label class="crit-field crit-toggle"><span>Chopper</span><div class="crit-switch"><input type="checkbox" id="critChopper" ${current.chopper?'checked':''}><b>${current.chopper?'Equipped':'Not equipped'}</b></div><small>+${Math.round(CHOPPER_CRIT_BONUS*100)}% chance and amount${autoChopper?' · found in your Base':''}</small></label>
        <label class="crit-field crit-toggle"><span>Rebirth perks</span><div class="crit-switch"><input type="checkbox" id="critPerks" ${critPerksOn()?'checked':''} ${rebirthBonus.chance||rebirthBonus.amount?'':'disabled'}><b>${rebirthBonus.chance||rebirthBonus.amount?`${critPerksOn()?'':'Off · '}+${Math.round(rebirthBonus.chance*100)}% / +${Math.round(rebirthBonus.amount*100)}%`:'—'}</b></div><small>${rebirthBonus.chance||rebirthBonus.amount?(critPerksOn()?`Chance and amount, banked through R: ${state.rebirth}`:'Left out, as on a fresh Super Rebirth'):'None yet · the first lands at R: 23'}</small><small class="crit-cost">${nextCritPerk?`Next at R: ${nextCritPerk.at} · +${nextCritPerk.chance||nextCritPerk.amount}% crit ${nextCritPerk.chance?'chance':'amount'}`:'Every rebirth crit perk is banked'}</small></label>
      </section>
      <div class="base-top crit-stats">
        <div class="stat"><small>Base hit</small><strong>${p.base.toFixed(1)}s</strong><em>level ${current.pickaxe}${current.astromech?` + ${current.astromech}`:''} = ${current.pickaxe+current.astromech} &middot; &times;${current.partyMultiplier.toFixed(1)} party</em></div>
        <div class="stat"><small>Average per swing</small><strong>${p.perHit.toFixed(1)}s</strong><em>×${p.multiplier.toFixed(3)} from crits</em></div>
        <div class="stat"><small>Critical Chance</small><strong>${(p.chance*100).toFixed(0)}%</strong><em>${p.chance>=1?'100% first roll; overflow helps later rolls':'chance of the first crit'}</em></div>
        <div class="stat"><small>Crit amount</small><strong>${(p.amount*100).toFixed(0)}%</strong><em>a crit does ×${(1+p.amount).toFixed(2)}</em></div>
      </div>
      ${best?`<div class="notice crit-best"><strong>Best next buy: ${best.name} ${best.to}</strong> — ${fmt(best.cost)} Nova for ${(best.gain*100).toFixed(2)}% more damage, working out at ${fmt(Math.round(best.cost/(best.gain*100)))} Nova for each 1%.</div>`:''}
      <section class="scrap-calculator crit-table"><div><p class="eyebrow">Next rank</p><h2>Which upgrade to buy</h2><p>The cheapest damage first: the last column is what one percent of extra damage costs you, so smaller is better. You have spent ${fmt(totalSpent)} Nova on crit perks so far.</p></div>
      <table><thead><tr><th>Upgrade</th><th>To</th><th>Cost</th><th>Seconds/hit</th><th>Extra damage</th><th>Nova per 1% damage</th></tr></thead><tbody>
      ${options.map((o,i)=>{const after=critProfile({...current,...(o.id===CRIT_UPGRADE_IDS.chance?{chanceLevel:o.to}:o.id===CRIT_UPGRADE_IDS.amount?{amountLevel:o.to}:{multiLevel:o.to})});
        return `<tr class="${o===best?String.fromCharCode(99,114,105,116,45,112,105,99,107):o.locked?String.fromCharCode(99,114,105,116,45,108,111,99,107,101,100):String()}"><th>${o.name}${o.note?`<small class="crit-note">${o.note}</small>`:''}</th><td>${o.to}</td><td>${fmt(o.cost)}</td><td>${after.perHit.toFixed(1)}s<small class="crit-note">from ${p.perHit.toFixed(1)}s</small></td><td>+${(o.gain*100).toFixed(2)}%</td><td>${fmt(Math.round(o.cost/(o.gain*100)))}</td></tr>`}).join('')||'<tr><td colspan="6">Everything is maxed.</td></tr>'}
      </tbody></table></section>
      <section class="scrap-calculator crit-table" id="critBreakdown">
        <h2>How your crits work</h2>
        <p>Each successful crit adds ${(p.amount*100).toFixed(0)}% of your base hit. The next roll has half the previous chance, and the chain ends on the first failed roll or after ${p.rolls} ${p.rolls===1?'crit':'crits'}.</p>
        <p>${p.chance>=1?'Your first crit is already guaranteed. More Critical Chance only improves later rolls that are not yet guaranteed; Multi Crit adds another possible roll.':'Below 100%, Critical Chance improves both the first roll and the later rolls.'} Upgrade rankings compare the average gain per Nova, not just the biggest hit.</p>
        <table><thead><tr><th>Crit</th><th>Chance if reached</th><th>Chance per swing of at least this many</th></tr></thead><tbody>${critRollBreakdown(p.chance,p.rolls).map(row=>`<tr><th>${row.count}</th><td>${fmt(row.rollChance*100)}%</td><td>${fmt(row.reach*100)}%</td></tr>`).join('')}</tbody></table>
        <label class="crit-field"><span>Temporary pickaxe multiplier</span><input type="number" id="critBoost" value="${current.boost}" min="1" step="0.1"><small>Normally 1. Enter the combined crafting/event pickaxe multiplier if active; this is not detected from your Base.</small></label>
        <p>Average per swing is a long-run average of crafting time removed, before capping at the time remaining on a droid. Temporary pickaxe multipliers change seconds per hit, but not the upgrade ranking.</p>
      </section>
      `;
    const bind=(id,key)=>{const el=document.querySelector('#'+id);if(el)el.onchange=()=>{setCritSetting(key,Number(el.type==='checkbox'?(el.checked?1:0):el.value)||0);render()}};
    bind('critBoost','boost');bind('critPickaxe','pickaxe');bind('critChopper','chopper');bind('critPerks','perks');
    // Perk levels write through to the Nova Shop itself.
    const setPerk=(id,level)=>{setNovaLevel(id,Math.max(0,level),false);save();render()};
    [['critChance',CRIT_UPGRADE_IDS.chance],['critAmount',CRIT_UPGRADE_IDS.amount],['critMulti',CRIT_UPGRADE_IDS.multi]]
      .forEach(([field,id])=>{const el=document.querySelector('#'+field);if(el)el.onchange=()=>setPerk(id,Number(el.value)||0)});
    document.querySelectorAll('[data-perk-up]').forEach(b=>b.onclick=()=>setPerk(b.dataset.perkUp,novaLevelFor(b.dataset.perkUp)+1));
    document.querySelectorAll('[data-perk-down]').forEach(b=>b.onclick=()=>setPerk(b.dataset.perkDown,novaLevelFor(b.dataset.perkDown)-1));
    document.querySelector('#critReset').onclick=()=>{['chopper','pickaxe','perks','boost'].forEach(k=>localStorage.removeItem('droid-archive-crit-'+k));render();toast('Pickaxe and companion reset to your Base')};
  };
  render();
}
function normaliseNovaIconicUnlocks(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(name=>typeof name==='string'&&state.droids.some(d=>d.name===name&&isIconic(d))))];
}
function novaIconicUnlocked(name){return normaliseNovaIconicUnlocks(state.novaIconicUnlocks).includes(name);}
function setNovaIconicUnlocked(name,unlocked){
  if(unlocked&&isComingSoonDroid(name)){toast('Unlocks when the event starts');return;}
  if(state.sharedView&&!state.sharedView.canEdit)return;
  const names=new Set(normaliseNovaIconicUnlocks(state.novaIconicUnlocks));
  if(unlocked)names.add(name);else names.delete(name);
  state.novaIconicUnlocks=normaliseNovaIconicUnlocks([...names]);
  save();
}
function novaIconicPurchaseOptions(baseP,projected){
  const owned=state.owned,baseline=Math.max(incomeForPlaced(baseP.placed),incomeForPlaced(projected.placed));
  const candidates=normaliseNovaIconicUnlocks(state.novaIconicUnlocks).filter(name=>!isComingSoonDroid(name)&&!owned.some(row=>row.name===name&&row.qty>0));
  const options=[];
  try{
    for(const name of candidates){
      // Evaluate one purchase at a time. Never add a hypothetical droid to the
      // saved roster or to the layout that Apply will use.
      state.owned=[...owned,{name,variant:'DEFAULT',qty:1,built:true,...(state.iconicTraits?.[name]?{trait:state.iconicTraits[name]}:{})}];
      const plan=optimiseBase(baseP,incomeForPlaced(baseP.placed));
      const preview=optimisedPlacements(baseP,plan),destination=preview.placed.find(x=>x.source===owned.length&&x.unit===0);
      const income=incomeForPlaced(preview.placed),gain=income-baseline;
      const earns=destination&&(PRODUCTIVE_STATIONS.includes(destination.station)||isProtocolStation(destination.station));
      options.push({name,gain:earns&&gain>Math.max(1e-7,baseline*1e-10)?gain:0,destination:destination?{station:destination.station,slot:destination.slot}:null});
    }
  }finally{state.owned=owned;}
  return options.sort((a,b)=>b.gain-a.gain||a.name.localeCompare(b.name));
}
// Missing copies exist only in this calculation. The route must purchase each
// one into a free Companion seat before it can move or appear in an applied save.
function prepareOptimiseLayout(baseP=placements(),progress){
  const owned=state.owned,currentIncome=incomeForPlaced(baseP.placed),chosen=[],returns=[];
  let comparisons=0;
  const keyOf=u=>`${u.source}:${u.unit}`;
  const calculate=(removed=returns)=>{
    const keys=new Set(removed.map(keyOf)),input={...baseP,placed:baseP.placed.filter(u=>!keys.has(keyOf(u))),overflow:(baseP.overflow||[]).filter(u=>!keys.has(keyOf(u)))};
    const plan=optimiseBase(input,currentIncome),projected=optimisedPlacements(input,plan);
    progress?.({phase:'layout',comparisons:++comparisons});return {plan,projected};
  };
  let best=calculate();
  if(!state.optimiseIncludeIconics)return {baseP,...best};
  const candidates=normaliseNovaIconicUnlocks(state.novaIconicUnlocks).filter(name=>!isComingSoonDroid(name)&&!owned.some(row=>row.name===name&&row.qty>0)).sort();
  const activity=COMPANION_ACTIVITIES[companionActivity()],preferences=activity?.prefer||preferredCompanions();
  const futureNames=new Set(futureRequirements().map(req=>req.droidName));
  const missingFuture=[...futureNames].filter(name=>!owned.some(u=>u.name===name&&u.qty>0)).length;
  const reserve=Math.min(2,missingFuture,stationSlotIndices('LOUNGE').length);
  const useful=unit=>unit&&(PRODUCTIVE_STATIONS.includes(unit.station)||isProtocolStation(unit.station)||unit.station==='COMPANION');
  const score=projected=>{
    const placed=projected.placed,companions=placed.filter(u=>u.station==='COMPANION');
    const wanted=preferences.map(name=>Number(activity?placed.some(u=>companionPerkActive(u,name)):companions.some(u=>u.name===name)));
    const mission=placed.filter(u=>u.missionPriority).reduce((n,u)=>n+(u.name==='R2-D2'?2:1),0);
    const goals=activity?.goal?[activity.goal]:companionGoals();
    const boosts=goals.map(id=>companions.reduce((n,u)=>{const d=state.droids.find(d=>d.name===u.name),goal=COMPANION_GOALS.find(g=>g.id===id);return n+unitCompanionGoal(u,goal.id)},0));
    const craft=PROTOCOL_REGIONS.reduce((n,_,i)=>n+protocolCraftBonus(placed,i),0);
    let income=incomeForPlaced(placed);
    if(companionActivity()==='scrap')income*=1+companions.reduce((n,u)=>{const d=state.droids.find(d=>d.name===u.name);return n+unitCompanionGoal(u,'credits')},0)/100/Math.max(1e-9,effectiveMultiplier());
    const production=state.protocolPriority==='crafting'?[craft,income]:[income,craft];
    const futureHeld=[...futureNames].reduce((n,name)=>{const ranks=placed.filter(u=>u.name===name).map(u=>variantRank(u.variant));return n+(ranks.length?1000+Math.max(...ranks):0)},0);
    const headroom=Math.min(reserve,Math.max(0,stationSlotIndices('LOUNGE').length-placed.filter(u=>u.station==='LOUNGE').length));
    return [futureHeld,...wanted,mission,...(activity&&companionActivity()!=='scrap'?boosts:[]),headroom,...production,...(!activity?boosts:[])];
  };
  const better=(a,b)=>{for(let i=0;i<a.length;i++){const tolerance=Math.max(1e-7,Math.abs(b[i])*1e-10);if(a[i]>b[i]+tolerance)return true;if(a[i]<b[i]-tolerance)return false;}return false;};
  const fits=(projected,count)=>projected.overflow.length<=best.projected.overflow.length&&Array.from({length:count},(_,i)=>owned.length+i).every(source=>useful(projected.placed.find(u=>u.source===source&&u.unit===0)));
  try{
    // Returning an unused Iconic preserves its permanent unlock. Keep source
    // indices stable while considering removals: zero quantity is local only.
    const returnable=[...baseP.placed,...(baseP.overflow||[])].filter(u=>owned[u.source]?.qty===1&&isIconic(state.droids.find(d=>d.name===u.name))&&!u.lockedSlot&&!isBuilding(u)&&!preferences.includes(u.name)&&!sparedFromSelling().includes(keyOf(u)));
    const roster=removed=>owned.map((u,source)=>removed.some(x=>x.source===source)?{...u,qty:0}:u);
    while(returnable.length){
      let winner=null;
      for(const unit of returnable){
        state.owned=roster([...returns,unit]);
        const result=calculate([...returns,unit]),value=score(result.projected),before=score(best.projected);
        if(!better(before,value)&&(!winner||better(value,winner.value)))winner={unit,result,value};
      }
      if(!winner)break;
      returns.push(winner.unit);returnable.splice(returnable.indexOf(winner.unit),1);best=winner.result;
    }
    while(candidates.length){
      let winner=null;
      for(const name of candidates){
        state.owned=[...roster(returns),...chosen,{name,variant:'DEFAULT',qty:1,built:true,...(state.iconicTraits?.[name]?{trait:state.iconicTraits[name]}:{})}];
        const result=calculate(),value=score(result.projected);
        if(fits(result.projected,chosen.length+1)&&better(value,score(best.projected))&&(!winner||better(value,winner.value)))winner={name,result,value};
      }
      if(!winner)break;
      chosen.push({name:winner.name,variant:'DEFAULT',qty:1,built:true,...(state.iconicTraits?.[winner.name]?{trait:state.iconicTraits[winner.name]}:{})});
      candidates.splice(candidates.indexOf(winner.name),1);best=winner.result;
    }
    // A fallback must also have somewhere useful for every planned purchase.
    let cursor=best.projected;
    while(cursor?.fallback){if(!fits(cursor.fallback,chosen.length))cursor.fallback=cursor.fallback.fallback;else cursor=cursor.fallback;}
    for(let target=best.projected;target;target=target.fallback){target.returns=returns.map(u=>({...u}));target.iconicReserve=reserve;}
    const purchases=chosen.map((unit,i)=>({...unit,source:owned.length+i,unit:0}));
    return {baseP:{...baseP,purchases},...best};
  }finally{state.owned=owned;}
}
function iconicPlanningToggleHtml(){
  return `<label class="side-check"><input type="checkbox" data-optimise-iconics ${state.optimiseIncludeIconics?'checked':''} ${state.sharedView&&!state.sharedView.canEdit?'disabled':''}> Plan Iconic purchases and returns</label>`;
}
document.addEventListener('change',event=>{
  if(!event.target.matches('[data-optimise-iconics]'))return;
  if(state.sharedView&&!state.sharedView.canEdit)return;
  state.optimiseIncludeIconics=event.target.checked;save();route();
});
function novaIconicPurchasesHtml(baseP,projected){
  if(state.optimiseIncludeIconics){
    const purchases=baseP.purchases||[],returns=projected.returns||[];
    return `<section class="nova-iconic-purchases"><header><div><p class="eyebrow">Permanent Nova unlocks</p><h2>Iconic purchases and returns</h2></div><a class="btn secondary" href="#/nova-shop" data-manage-iconic-unlocks>Manage unlocks</a></header><p>${purchases.length?`This route buys ${purchases.map(u=>escapeAttr(u.name)).join(', ')} and makes room using your existing Keep, lock and fusion settings. Buy them at the Cantina and send them to the Lounge where space allows. Apply the purchase checkpoint to check their positions on your Base map before continuing.`:'No additional unlocked Iconic improves this layout with your current priorities and available space.'}</p>${returns.length?`<p>Return ${returns.map(u=>escapeAttr(u.name)).join(', ')} to free space. Their unlocks are kept, so you can get them from the Cantina again.</p>`:''}${projected.iconicReserve?`<p>Keeping up to ${projected.iconicReserve} Lounge spaces free for rebirth droids you have not collected yet. Locked droids and chosen companions stay protected.</p>`:''}</section>`;
  }
  const options=projected.iconicOptions||[];
  const unlocked=normaliseNovaIconicUnlocks(state.novaIconicUnlocks);
  return `<section class="nova-iconic-purchases"><header><div><p class="eyebrow">Permanent Nova unlocks</p><h2>Iconic purchases</h2></div><a class="btn secondary" href="#/nova-shop" data-manage-iconic-unlocks>Manage unlocks</a></header>
    <p>Buy a copy when it improves your credit income. Estimates include displaced earners, locked slots, Astromech priorities and Protocol bonuses.</p>
    ${options.length?`<div class="nova-iconic-purchase-list">${options.map(option=>`<article class="nova-iconic-purchase ${option.gain>0?'worth-buying':''}"><a href="#/droid/${slug(option.name)}">${picture(state.droids.find(d=>d.name===option.name),'DEFAULT')}<strong>${escapeAttr(option.name)}</strong></a><div><strong>${option.gain>0?'Buy for credit gain':'Wait for credit gain'}</strong><span>${option.gain>0?`+${fmt(option.gain*3600)} credits/hour &middot; ${escapeAttr(stationName(option.destination.station))} slot ${option.destination.slot+1}`:'No estimated credit increase with your current base and priorities.'}</span></div></article>`).join('')}</div><p class="nova-iconic-purchase-note">Each option is compared separately with your optimised base. After buying one in game, add it to Base and recalculate. Gains show income, not purchase payback or affordability.</p>`:`<p class="nova-iconic-purchase-note">${projected.iconicOptions===undefined&&unlocked.some(name=>!state.owned.some(u=>u.name===name&&u.qty>0))?(['idle','queued','searching'].includes(optimiseBackgroundStatus)?'Checking unlocked Iconics in the background...':'Iconic comparisons could not finish within this search. Your verified route is still available.'):unlocked.length?'Your Base already contains every iconic you marked as unlocked.':'Tick your permanent iconic unlocks in Nova Shop to check which copies would increase your income.'}</p>`}
  </section>`;
}
// What the page says when the walk has nothing to do. That is only "optimal"
// when the search agrees; when it found a better layout that no command can
// reach, say so, name the droids in the way and what would free them.
function optimiseSettledHtml(plan,p){
  if(!(plan?.gain>1))return '<p class="optimise-settled">No higher-income layout found with your current settings.</p>';
  const moves=plan.moves||[],keyOf=x=>`${x.source}:${x.unit}`,detailOf=key=>String(p.placed.find(x=>keyOf(x)===key)?.keepDetail||'').replace(/<[^>]+>/g,'');
  const wants=moves.slice(0,3).map(move=>`${escapeAttr(move.unit.name)} ${variantLabel(move.unit.variant)} to ${stationName(move.targetStation)}`).join(', ')+(moves.length>3?` and ${moves.length-3} more`:'');
  const movers=new Set(moves.map(move=>move.unit.key)),blocked=[...new Map(moves.filter(move=>move.displaced&&!movers.has(move.displaced.key)).map(move=>[move.displaced.key,move.displaced])).values()]
    .map(unit=>{const why=detailOf(unit.key);return `${escapeAttr(unit.name)} ${variantLabel(unit.variant)}${why?` (${escapeAttr(why)})`:''}`}).join(', ');
  const fusionOption=!state.fusionAsLounge&&stationSlotIndices('FUSION').length>0;
  return `<div class="optimise-settled optimise-blocked"><p><strong>A better layout was found, but no moves are ready.</strong> Potential gain: ${fmt(plan.gain*3600)}/h${wants?` by moving ${wants}`:''}. The current storage and protection settings prevent this plan${blocked?`: these droids need somewhere to go: ${blocked}`:'. No executable route was found'}.</p><p>Free a Lounge slot, review your locks or Keep for fusion rules${fusionOption?', or allow Fusion slots to hold spare droids':''}, then regenerate.</p>${fusionOption?'<button class="btn secondary" id="optimiseAllowFusionStorage" type="button">Allow Fusion storage and recalculate</button><p><small>This enables Use Fusion as Lounge slots. Droids stored there are included if you press Fuse.</small></p>':''}</div>`;
}
// Three buttons for what you are doing, the World missions one opening its three
// kinds. Pressing the active one again turns the mode off.
function companionActivityHtml(baseP){
  const active=companionActivity(),activity=COMPANION_ACTIVITIES[active],{picks,missing,locked,gain,working=[]}=companionActivityPicks(baseP);
  const button=(id,label,on)=>`<button type="button" class="btn secondary companion-activity-button ${on?'active':''}" data-companion-activity="${id}" aria-pressed="${on}">${label}</button>`;
  const notes=[];
  if(activity){
    notes.push(picks.length?`Companions: ${picks.map(x=>`${x.name}${isIconic(state.droids.find(d=>d.name===x.name))?'':` ${variantLabel(x.variant)} (${droidAttribute(state.droids.find(d=>d.name===x.name),x.variant)})`}`).join(' + ')}`:working.length?'Requested perks are covered at work.':'No droid you own fits this yet.');
    if(working.length)notes.push(`Perks active while working: ${working.map(x=>x.name).join(', ')} (trait; no Companion seat needed)`);
    if(active==='scrap'&&gain!==null)notes.push(gain>0.0005?`about +${(gain*100).toFixed(1)}% credits over your Companions and Credits slots as they are, counting the Protocol slots the rest can fill`:'your Companions and Credits slots already earn the most');
    if(active==='scrap')notes.push(`uses your Base multiplier ×${effectiveMultiplier()}, which should be the one the game shows with no Protocol droid beside you`);
    if(missing.length)notes.push(`Not on your Base: ${missing.join(', ')}`);
    if(locked.length)notes.push(`${locked.map(x=>x.name).join(', ')} ${locked.length===1?'is':'are'} locked in ${locked.length===1?'a Companion seat':'Companion seats'} and ${locked.length===1?'stays':'stay'}`);
  }
  return `<section class="iconic-planning-controls">${iconicPlanningToggleHtml()}<small>Buy useful Iconics marked unlocked in <a href="#/nova-shop" data-manage-iconic-unlocks>Nova Shop</a>, and return weaker or unused Iconics. Leaves up to two Lounge spaces for missing rebirth droids.</small></section><section class="companion-activity" aria-label="Companions for what you are doing"><span class="companion-activity-title">Companions for</span>${button('scrap','Scrap farming',active==='scrap')}${button('crafting','Crafting',active==='crafting')}${button('missions','World missions',Boolean(activity?.missions))}${activity?.missions?`<span class="companion-activity-sub">${['combat','mining','fishing'].map(id=>button(id,COMPANION_ACTIVITIES[id].label,active===id)).join('')}</span>`:''}<small>${activity?`${activity.label}: ${activity.why}. ${notes.join(' · ')}.`:'Pick what you are doing and Optimise swaps your Companions to suit. Press it again to go back to your own Companion choices.'}</small></section>`;
}
function wireCompanionActivityButtons(){
  document.querySelectorAll('[data-companion-activity]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.companionActivity,active=companionActivity(),inMissions=Boolean(COMPANION_ACTIVITIES[active]?.missions);
    // World missions opens on Combat; pressing the active mode again turns it off.
    setCompanionActivity(id==='missions'?(inMissions?null:'combat'):id===active?null:id);
    optimisePage();
  }));
}
function optimisePage(){
  const preview=backgroundOptimisePreview();
  if(!preview){
    if(companionMode)window.__companionApplyOptimise=()=>({applied:false,reason:'Optimise is still finding a verified route for this Base'});
    const searching=['idle','queued','searching'].includes(optimiseBackgroundStatus);
    // The activity buttons stay while a new search runs, so a mode can be
    // switched again or off without waiting for the route.
    const comparing=searching&&!optimiseBackgroundJob?.targets,comparisons=optimiseBackgroundJob?.progress?.comparisons;
    const message=searching?(comparing?`Comparing Base layouts${comparisons?` (${comparisons} checked)`:''}. You can keep using the site.`:'Finding and checking the moves for your Base. You can keep using the site.')
      :optimiseBackgroundStatus==='budget'?'The search reached its time limit before completing a plan. Your Base has not changed.'
      :optimiseBackgroundStatus==='error'?'Optimise could not finish this calculation. Your Base has not changed.'
      :'The search has not found a complete move sequence yet. Your Base has not changed.';
    const issues=!searching?optimiseBackgroundJob?.issues||[]:[];
    app.innerHTML=`<h1>Optimise</h1>${companionActivityHtml(placements())}<section class="panel" role="status"><p>${message}</p>${issues.length?`<p class="muted">${issues.map(escapeAttr).join('<br>')}</p>`:''}${searching?'':`<button class="btn" id="retryBackgroundOptimise">${optimiseBackgroundStatus==='error'?'Try again':'Search longer'}</button>`}</section>`;
    wireCompanionActivityButtons();
    document.querySelector('#retryBackgroundOptimise')?.addEventListener('click',()=>{optimiseBackgroundJob=null;refreshBackgroundOptimise(true);optimisePage()});
    publishCompanionState({computed:false,steps:[],route:[],stops:0});return;
  }
  const ticked=optimiseTickedProjection(preview);
  const {baseP,plan,projected:p,steps,currentIncome,income}=preview,stepsCollapsed=localStorage.getItem('droid-archive-optimise-steps-collapsed')==='1',gain=income-currentIncome,currentScrap=scrapPayoutsForIncome(currentIncome),optimisedScrap=scrapPayoutsForIncome(income,'default',p.placed),scrapGain={hit:Math.max(0,(optimisedScrap.hit||0)-(currentScrap.hit||0)),break:Math.max(0,(optimisedScrap.break||0)-(currentScrap.break||0))},rebirthPick=p.placed.reduce((map,x)=>{const previous=map.get(x.name);if(!previous||variantRank(x.variant)>variantRank(previous.variant))map.set(x.name,{variant:x.variant,key:`${x.source}:${x.unit}`});return map},new Map()),currentMap=new Map(baseP.placed.map(x=>[`${x.source}:${x.unit}`,x]));
  const nothingToDo=p.planComplete&&!steps.filter(x=>x.type!=='note').length&&!p.sell.length&&gain<=1;
  const classicSteps=optimiseStepStyle()==='classic',visits=classicSteps?[]:optimiseVisits(steps);
  const stepsEyebrow=classicSteps?'Slot-by-slot order':`Walk round the base · ${visits.length} stop${visits.length===1?'':'s'}`;
  const stepsList=classicSteps
    ?`<ol ${stepsCollapsed?'hidden':''}>${steps.map(step=>`<li class="${stepTicked(optimiseStepKey(step))?'step-done':''}">${stepHtml(step)}</li>`).join('')}</ol>`
    :`<ol class="optimise-visits" ${stepsCollapsed?'hidden':''}>${visits.map(v=>{const droids=new Set(v.steps.filter(step=>step.unit).map(step=>`${step.unit.source}:${step.unit.unit}`)).size;return `<li class="optimise-visit"><h3>${optimiseRegionName(v.at)}<small>${droids} droid${droids===1?'':'s'}</small></h3><ul>${v.steps.map(step=>`<li class="${stepTicked(optimiseStepKey(step))?'step-done':''}">${stepHtml(step)}</li>`).join('')}</ul></li>`}).join('')}</ol>`;
  // Hidden unless the account that owns the research is signed in.
  const trackToggle=`<span class="optimise-track" id="optimiseTrack" hidden><button class="btn secondary" type="button">Track slot choices</button><small></small></span>`;
  const stepsStyleToggle=`<button class="btn secondary optimise-style-toggle" id="toggleStepStyle" title="${classicSteps?'Switch to the route-based plan that groups moves by station':'Switch to the original slot-by-slot plan'}">${classicSteps?'Use route plan':'Use classic plan'}</button>`;
  const productive=p.placed.filter(x=>PRODUCTIVE_STATIONS.includes(x.station)),baseIncome=placedBaseIncome(productive);
  const originLabel=x=>{const origin=currentMap.get(`${x.source}:${x.unit}`);return origin?`${origin.station} ${origin.slot+1}${floorNote(origin.station,origin.slot)}`:'Roster'};
  const replacementLabel=(occupant,type,index)=>{const key=`${occupant.source}:${occupant.unit}`,origin=currentMap.get(key),original=baseP.placed.find(x=>x.station===type&&x.slot===index);if(origin?.station===type&&origin?.slot===index)return'';if(!original)return'Empty slot';if(`${original.source}:${original.unit}`===key)return'';return`${original.name} ${variantText(original.variant)}`};
  const slot=(type,index)=>{
    const occupant=p.placed.find(x=>x.station===type&&x.slot===index);
    if(occupant){const d=state.droids.find(x=>x.name===occupant.name),cycleStatus=droidCycleStatus(d,occupant.variant,rebirthPick.get(d.name)?.key===`${occupant.source}:${occupant.unit}`),match=!isIconic(d)&&type===d.type,production=slotProductionHtml(d,occupant.variant,type,baseIncome,p.placed,index),replace=replacementLabel(occupant,type,index);return `<div class="base-slot occupied ${match?'matched-slot':''} ${occupant.lockedSlot?'slot-pinned':''} cycle-${cycleStatus.kind} optimise-preview"><a href="#/droid/${slug(d.name)}"><div>${picture(d,occupant.variant)}</div><strong>${d.name}</strong><small class="slot-production">${production}${match?'<em class="match-bonus">+10% match</em>':''}</small>${occupant.lockedSlot?'<em class="lock-status">Locked for Optimise</em>':''}${occupant.keepDetail?`<em class="keep-status keep-${occupant.keepReason}">${occupant.keepDetail}</em>`:''}<em class="origin-status">From: ${originLabel(occupant)}</em>${replace?`<em class="origin-status">Target has: ${replace}</em>`:''}<em class="cycle-status cycle-${cycleStatus.kind}">${cycleStatus.label}</em>${missionSlotBadge(type,index)}</a></div>`}
    const eligible=isSlotEligible(type,index),purchased=isSlotPurchased(type,index),locked=!eligible||!purchased,label=eligible&&!purchased?'Purchase this slot in Base':locked?lockedSlotLabel(type,index):`${stationName(type)} slot`;
    return `<button class="base-slot ${locked?'locked':'open'}" ${locked?'disabled':''}><span class="slot-icon">${stationIcon(type)}</span><small>${label}</small></button>`
  };
  const station=type=>{const total=SLOT_RULES[type].initial+SLOT_RULES[type].unlocks.length,active=capacity(type),eligible=Array.from({length:total},(_,i)=>i).filter(i=>isSlotEligible(type,i)).length,toPurchase=eligible-active,future=total-eligible,used=p.placed.filter(x=>x.station===type).length,slots=Array.from({length:total},(_,i)=>`${slotDivider(type,i)}${slot(type,i)}`).join('')+protocolSlotsHtml(type,slot);const fuseControl=type==='FUSION'?`<button class="btn secondary station-fuse" id="runFusion" type="button" ${used<3?'disabled':''} title="${used<3?'Fill all three Fusion slots first':'Fuse these three droids'}">Fuse</button>`:'';
    return `<section class="station station-${type.toLowerCase().replaceAll('_','-')}"><header><span>${stationIcon(type)}<strong>${stationName(type)}</strong>${fuseControl}</span><small>${used}/${active} slots${toPurchase?` · ${toPurchase} not purchased`:''}${future?` · ${future} locked`:''}</small></header><div class="slot-grid">${slots}</div></section>`};
  const overflow=p.overflow.map(x=>{const d=state.droids.find(y=>y.name===x.name);return `<div class="roster-card"><a href="#/droid/${slug(d.name)}">${picture(d,x.variant)}<span><strong>${d.name}</strong><small>${variantText(x.variant)} &middot; not placed</small></span></a></div>`}).join('');
  const fuseOn=state.optimiseFuseFirst!==false;
  const fuseChain=steps.filter(s=>s.type==='fuse').map(s=>s.fusion);
  const fusePreferences=normaliseFusionPreferences(state.fusionPreferences);
  const fusePreferenceSummary=`Common through Legendary: ${{balanced:'balanced fusion progress',rarity:'higher rarity only',variant:'higher variant of the same droid'}[fusePreferences.goal]}. Mythics: ${{variant:'variant upgrades and dormant Kyber rerolls',reroll:'reroll for another Mythic',off:'kept out of fusion'}[fusePreferences.mythics]}.`;
  const fuseEmptyReason=(p.later||[]).length?'Eligible fusions are waiting for Fusion Build space or an earlier result to finish building.':'No eligible spare batch matches your current Fusion settings. Droids assigned to work and protected rebirth copies are not spare inputs.';
  // Match the exact copies used by the walkthrough, including Sell overrides.
  const fuseDeferred=new Set(steps.filter(s=>s.type==='fuse-deferred').map(s=>`${s.unit.source}:${s.unit.unit}`));
  const fuseTake=new Set(steps.filter(s=>['fuse-in','fuse-held'].includes(s.type)).map(s=>`${s.unit.source}:${s.unit.unit}`));
  const fuseSwitch=`<label class="fuse-first-switch"><input type="checkbox" id="toggleFuseFirst" ${fuseOn?'checked':''}><span>Fuse instead of selling</span></label>`;
  const fuseStep=step=>{
    const spend=step.spend.map(part=>`${part.count} &times; ${escapeAttr(part.name)} ${variantText(part.variant)}`).join(' + ');
    const out=step.out?`<strong>${escapeAttr(step.out.name)}</strong> ${variantText(step.out.variant)}`:`a ${rarityText(step.rarity)} droid ${variantText(step.variant)}`;
    const why=[step.fills?'<b>fills a Droidex square</b>':'',step.gain>0?`${step.sure?'':'about '}+${fmt(step.gain*3600)}/hr`:''].filter(Boolean).join(' &middot; ');
    return `<li class="${step.sure?'is-sure':'is-roll'}">
      <span class="fuse-first-no">${step.step}</span>
      <span class="fuse-first-in">${spend}</span>
      <span class="fuse-first-out">${out}</span>
      <em class="fuse-first-why">${why||'keeps it out of the Sell list'}</em>
      ${step.after.length?`<small class="fuse-first-after">Waits for step ${step.after.map(i=>i+1).join(' and ')} &mdash; it spends what that one makes.</small>`:''}
      ${step.sure?'':`<small class="fuse-first-after">${step.variantUpgrade?'A variant upgrade: the rarity stays Mythic and the variant increases; which droid arrives is random.':step.rarity===step.from?'A Mythic reroll: rarity and variant stay the same; which droid arrives is random.':'A roll: three of one rarity come out one rarity higher; which droid arrives is random.'}</small>`}</li>`;
  };
  const fuseFirst=`<section class="sell-wide fuse-first ${fuseOn?'':'is-off'}"><header><div><strong>Fuse before you sell</strong><span>${fuseOn?`${fuseChain.length} fusion${fuseChain.length===1?'':'s'} planned from spare droids`:'Off &mdash; everything below is sold'}</span></div><div class="fusion-planning-actions">${fuseSwitch}<button class="btn secondary" type="button" data-fusion-settings>Fusion settings</button></div></header>
    ${fuseOn?`${fuseChain.length?`<ol class="fuse-first-list">${fuseChain.map(fuseStep).join('')}</ol>`:`<p class="fuse-first-note">${fuseEmptyReason}</p>`}<p class="fuse-first-note">${fusePreferenceSummary}</p>
    <p class="fuse-first-note">Each planned fusion consumes three droids and creates one result, freeing two spaces overall. Fusion Preservation droids are excluded from automatic fusion batches; fuse them manually in Base so the surviving droid can be placed correctly. Optimise can move finished droids out of Fusion Build to make room, even without an income gain. New results must finish building before they can be used again.</p>`:'<p class="fuse-first-note">Turn this on and the Sell list is checked for fusions worth making first &mdash; progress towards your fusion goals, even when income stays the same.</p>'}</section>`;
  const sell=p.sell.map(x=>{const d=state.droids.find(y=>y.name===x.name);const toFusion=fuseTake.has(`${x.source}:${x.unit}`),deferred=fuseDeferred.has(`${x.source}:${x.unit}`);return `<div class="sell-card cycle-unused ${toFusion?'to-fusion':''}"><a href="#/droid/${slug(d.name)}"><div>${picture(d,x.variant)}</div><span><strong>${d.name}</strong><small>${variantText(x.variant)} · From: ${originLabel(x)}</small><em>${toFusion?'&rarr; Fusion room, not sold':deferred?'Waiting for Fusion Build space':(x.sellReason||'No rebirth use')}</em></span></a></div>`}).join('');
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Optimise</div><div class="base-heading"><div><p class="eyebrow">Credit optimiser</p><h1>Optimise</h1><p class="lead">A preview of your Base using your Protocol priority: ${state.protocolPriority==='crafting'?'higher craft speed':'higher credit gain'}.</p></div>${nothingToDo?optimiseSettledHtml(plan,p):`<button class="btn" id="applyOptimised" ${p.planComplete?'':'disabled title="This plan cannot be applied yet. The note at the end of the steps says why."'}>Apply optimised layout</button>${ticked?`<button class="btn secondary" id="applyOptimisedSteps" title="${escapeAttr(ticked.partialMessage)}">Apply ticked steps (${ticked.tickedCount}/${ticked.tickedTotal})</button>`:''}`}</div>${companionActivityHtml(baseP)}<div class="base-top optimise-stats"><div class="stat"><small>Current / hour</small><strong>${fmt(currentIncome*3600)}</strong></div><div class="stat"><small>Optimised / hour</small><strong>${fmt(income*3600)}</strong></div><div class="stat"><small>Estimated gain / hour</small><strong>${gain?`${gain>0?'+':''}${fmt(gain*3600)}`:'—'}</strong></div><div class="stat scrap-stat"><small>Optimised scrap / hit</small><strong>${optimisedScrap.hit?fmt(optimisedScrap.hit):'—'}</strong><em>${scrapGain.hit?`+${fmt(scrapGain.hit)} per hit`:'No change'}</em></div><div class="stat scrap-stat"><small>Optimised scrap / break</small><strong>${optimisedScrap.break?fmt(optimisedScrap.break):'—'}</strong><em>${scrapGain.break?`+${fmt(scrapGain.break)} per break`:'No change'}</em></div><div class="stat"><small>Droids owned</small><strong>${state.owned.reduce((s,x)=>s+x.qty,0)}</strong></div></div>${nothingToDo?'':`<div class="notice">This page does not change your Base until you click <strong>Apply optimised layout</strong>. Droids in Sell are excluded from the applied layout.${ticked?` Tick the steps you have done: <strong>Apply ticked steps</strong> records the first ${ticked.tickedCount} of ${ticked.tickedTotal}, leaving your Base at ${fmt(ticked.income*3600)}/hr${ticked.income<currentIncome*0.999?' (less than now until you finish the walk)':''}.`:' Tick steps as you do them to record part of the walk. Locked companions may be swapped temporarily; the route restores the same droids to the same Companion slots with their locks kept. Ticked steps can be saved once those companions are back.'}</div>`}${missingPreferredCompanions().length?`<div class="notice companion-wanted"><strong>Buy for a Companion slot:</strong> ${missingPreferredCompanions().map(name=>`<a href="#/droid/${slug(name)}">${name}</a>`).join(', ')} — you picked ${missingPreferredCompanions().length===1?'this':'these'} as a preferred companion but ${missingPreferredCompanions().length===1?'do not':'do not'} own ${missingPreferredCompanions().length===1?'it':'them'} yet.</div>`:''}${novaIconicPurchasesHtml(baseP,p)}${steps.length?`<section class="optimise-steps ${stepsCollapsed?'collapsed':''}"><header><div><p class="eyebrow">${stepsEyebrow}</p><h2>Step-by-step moves</h2></div><div class="optimise-steps-actions">${trackToggle}${stepsStyleToggle}<button class="icon-btn optimise-steps-toggle" id="toggleOptimiseSteps" title="${stepsCollapsed?'Show':'Minimise'} steps">${stepsCollapsed?'+' :'−'}</button></div></header>${stepsList}</section>`:''}${traitComparisonHtml(baseP.placed,p.placed)}${traitLossText(p.sell)?`<p class="notice">${escapeAttr(traitLossText(p.sell))}</p>`:''}${protocolSummaryHtml(p.placed)}${craftingSummaryHtml(p.placed)}<div class="base-layout-v2 optimise-layout"><div class="typed-stations">${['WORKER','ASTROMECH','BATTLE'].map(region=>'<div class="region-stations">'+station(region)+'</div>').join('')}</div><div class="build-side">${station('BUILD')}</div>${overflow?`<section class="roster-wide"><header><div><strong>Unplaced</strong><span>${p.overflow.length} over capacity</span></div></header><div id="rosterCards">${overflow}</div></section>`:''}${fuseFirst}${sell?`<section class="sell-wide"><header><div><strong>Sell</strong><span>${p.sell.length} unused or duplicate rebirth droid${p.sell.length===1?'':'s'}</span></div></header><div class="sell-grid">${sell}</div></section>`:''}</div>`;
  document.querySelector('.build-side').insertAdjacentHTML('afterend',`<div class="special-stations">${station('LOUNGE')}${station('COMPANION')}${station('UPGRADE_CHIP')}<div class="fusion-panel">${station('FUSION')}${fusionBuildSection(station('FUSION_BUILD'))}</div></div>`);
  document.querySelector('.base-heading')?.insertAdjacentHTML('afterend',`<p id="optimiseBackgroundStatus" role="status">${optimiseTickedPrefix(preview).count?'Keeping your current instructions while you follow them.':optimiseBackgroundStatus==='searching'?'Route ready. Looking for a shorter walk in the background.':'Best route found for your current Base.'}</p>`);
  document.querySelectorAll('[data-manage-iconic-unlocks]').forEach(link=>link.addEventListener('click',()=>localStorage.setItem('droid-archive-nova-category','iconic')));
  wireCompanionActivityButtons();
  document.querySelector('#optimiseAllowFusionStorage')?.addEventListener('click',()=>{state.fusionAsLounge=true;save();optimisePage()});
  document.querySelector('#toggleFuseFirst')?.addEventListener('change',event=>{state.optimiseFuseFirst=event.target.checked;save();optimisePage()});document.querySelector('#toggleOptimiseSteps')?.addEventListener('click',()=>{localStorage.setItem('droid-archive-optimise-steps-collapsed',stepsCollapsed?'0':'1');optimisePage()});
  document.querySelector('#toggleStepStyle')?.addEventListener('click',()=>{localStorage.setItem('droid-archive-optimise-step-style',classicSteps?'route':'classic');optimisePage();toast(classicSteps?'Using the route plan':'Using the classic slot-by-slot plan')});
  document.querySelectorAll('[data-apply-through]').forEach(button=>button.addEventListener('click',async()=>{
    const all=preview.steps.filter(step=>step.type!=='note'),through=all.findIndex(step=>optimiseStepKey(step)===button.dataset.applyThrough)+1;
    const partial=optimiseTickedProjection(preview,through);if(!partial)return;
    button.disabled=true;
    try{
      await applyOptimisedLayout({...preview,projected:partial});
      if(preview.inputStamp!==optimiseInputStamp()&&location.hash==='#/base'){
        sessionStorage.setItem('droid-archive-purchase-checkpoint',String(state.cloud?.activeProfileId||'local')+'|'+String(state.sharedView?.profile?.id||''));localStorage.setItem('droid-archive-map-hidden','0');purchaseCheckpointFocus=true;
      }
    }finally{if(button.isConnected)button.disabled=false;}
  }));
  document.querySelector('#applyOptimisedSteps')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await applyOptimisedLayout({...preview,projected:ticked})}finally{if(button.isConnected)button.disabled=false}});
  document.querySelector('#applyOptimised')?.addEventListener('click',async event=>{const button=event.currentTarget,label=button.textContent;button.disabled=true;button.textContent='Applying…';try{await applyOptimisedLayout(preview)}finally{if(button.isConnected){button.disabled=!p.planComplete||preview.inputStamp!==optimiseInputStamp();button.textContent=button.disabled?'Regenerate Optimise':label}}});
  // Owner only, and only on your own Base: arm tracking, then every send-to-work
  // step offers a box.
  const trackHost=document.querySelector('#optimiseTrack');
  if(trackHost&&slotLabAllowed()&&!state.sharedView){
    trackHost.hidden=false;
    const button=trackHost.querySelector('button');
    button.textContent=slotLogTracking()?'Tracking slots · on':'Track slot choices';
    button.classList.toggle('active',slotLogTracking());
    trackHost.querySelector('small').textContent=`${slotLogAll().length} landings recorded`;
    button.onclick=()=>{slotLogSetTracking(!slotLogTracking());optimisePage()};
  }

  document.querySelectorAll('[data-log-step]').forEach(picker=>{
    picker.onchange=()=>{
      const step=steps.find(x=>x.text===picker.dataset.logStep);
      if(!step||picker.value==='')return;
      const cut=picker.value.indexOf(':');
      const spot={station:picker.value.slice(0,cut),slot:Number(picker.value.slice(cut+1))};
      // The options came from the free set, so this cannot be an occupied slot.
      slotLogAdd({station:spot.station,fromStation:typeof step.from==='string'?step.from:step.from?.station,fromSlot:step.fromSlot,
        free:step.freeSlots,landed:spot.slot,plannedStation:typeof step.to==='string'?step.to:step.to?.station,
        droid:step.unit?.name||'',droidType:state.droids.find(d=>d.name===step.unit?.name)?.type||''});
      slotLogSession.set(step.text,spot);
      toast(`Recorded · ${stationSlotLabel(spot.station,spot.slot)}`);
      optimisePage();
    };
  });
  // A tick changes what "Apply ticked steps" would save, so the page redraws
  // (the plan itself is cached) without losing the scroll position.
  document.querySelectorAll('[data-step-tick]').forEach(box=>box.onclick=e=>{e.stopPropagation();toggleTickedStep(box.dataset.stepTick);const y=scrollY;route();scrollTo(0,y)});
  document.querySelectorAll('[data-sell-instead]').forEach(button=>button.onclick=()=>{sellInsteadOfFusion(button.dataset.sellInstead);optimisePage()});
  document.querySelectorAll('[data-skip-sell]').forEach(button=>button.onclick=()=>{spareFromSelling(button.dataset.skipSell);optimisePage()});
  if(companionMode){
    // The Electron overlay triggers these from Shift+O / Ctrl+O. Unlike the
    // web button they never prompt (no confirm() in a headless webview) and
    // snapshot the current base so the apply can be undone.
    window.__companionApplyOptimise=()=>{
      try{
        if(preview.inputStamp!==optimiseInputStamp())return{applied:false,reason:'Your Base or settings changed. Regenerate Optimise first'};
        const projected=structuredClone(preview.projected);
        if(!projected.planComplete)return{applied:false,reason:projected.planIssues?.[0]||'Regenerate Optimise before applying'};
        if(projected.fusionResults?.some(result=>result.fusionUnknown))return{applied:false,reason:'Use Apply optimised layout on the Base website to select your random fusion results first'};
        window.__companionOptimiseUndo=state.owned.map(r=>({...r}));
        state.owned=projected.rows;save();
        return{applied:true,sold:projected.sell.length};
      }catch(e){return{applied:false,error:String(e&&e.message||e)}}
    };
    window.__companionUndoOptimise=()=>{
      if(!window.__companionOptimiseUndo)return{undone:false,reason:'nothing-to-undo'};
      state.owned=window.__companionOptimiseUndo;window.__companionOptimiseUndo=null;save();
      return{undone:true};
    };
  }
  publishCompanionState({
    computed:true,
    gainPerHour:gain*3600,currentPerHour:currentIncome*3600,optimisedPerHour:income*3600,
    gainText:gain?`+${fmt(gain*3600)}`:'—',
    scrapHitText:optimisedScrap.hit?fmt(optimisedScrap.hit):'—',
    scrapHitGainText:scrapGain.hit?`+${fmt(scrapGain.hit)} per hit`:'No change',
    scrapBreakText:optimisedScrap.break?fmt(optimisedScrap.break):'—',
    scrapBreakGainText:scrapGain.break?`+${fmt(scrapGain.break)} per break`:'No change',
    steps:steps.map(step=>String(step.text||'').replace(/<[^>]*>/g,'')),
    // The same walk, structured, so the overlay can group it by room and show
    // what is already ticked off on the website.
    stops:p.routeStops||0,
    route:steps.map((step,index)=>({index,type:step.type,at:step.at,room:optimiseRegionName(step.at),visit:step.visit||'',assumed:Boolean(step.assumed),
      done:step.type!=='note'&&stepTicked(optimiseStepKey(step)),text:String(step.text||'').replace(/<[^>]*>/g,'').replace(/&mdash;/g,'—'),
      unit:step.unit?{name:step.unit.name,variant:step.unit.variant}:null}))
  })
}
function rebirthCheapestPaths(cycle){
  const productiveMultiplier=(d)=>effectiveMultiplier()*(d?.type==='WORKER'?1.1:d?.type==='ASTROMECH'?1.1:d?.type==='BATTLE'?1.1:1);
  const requirements=cycle.filter(r=>r.to>state.rebirth&&r.to<=rebirthGoal()).flatMap(r=>(r.requiredDroids||[]).map(req=>({...req,at:r.to})));
  const seen=new Set(),paths=[];
  for(const req of requirements){
    const key=`${req.droidName}:${req.variant}`;
    if(seen.has(key)||hasRequirement(req))continue;
    seen.add(key);
    const d=state.droids.find(x=>x.name===req.droidName),have=bestOwnedVariant(req.droidName);
    if(!d){continue}
    if(!have){paths.push({droid:d,requirement:req,kind:'missing',cost:Infinity,efficiency:0});continue}
    const cost=chipsToVariant(d,have,req.variant),fromIncome=d.variants?.[have]?.income||0,toIncome=d.variants?.[req.variant]?.income||0,gainHour=Math.max(0,toIncome-fromIncome)*productiveMultiplier(d)*3600;
    paths.push({droid:d,requirement:req,kind:'upgrade',have,cost,gainHour,efficiency:cost?gainHour/cost:gainHour});
  }
  return paths.sort((a,b)=>(a.kind==='missing')-(b.kind==='missing')||a.cost-b.cost||b.efficiency-a.efficiency||a.requirement.at-b.requirement.at);
}
function rebirthCheapestPathsHtml(cycle){
  const paths=rebirthCheapestPaths(cycle),upgrades=paths.filter(x=>x.kind==='upgrade').slice(0,6),missing=paths.filter(x=>x.kind==='missing').slice(0,6);
  if(!paths.length)return'';
  const placedByUnit=new Map(placements().placed.map(unit=>[`${unit.source}:${unit.unit}`,unit]));
  const upgradeCards=upgrades.map(x=>{
    const candidates=expandedOwned().filter(unit=>unit.name===x.droid.name&&unit.variant===x.have).map(unit=>({...unit,...(placedByUnit.get(`${unit.source}:${unit.unit}`)||{})}));
    const unit=candidates.find(candidate=>candidate.station)||candidates[0];
    const control=unit&&!isIconic(x.droid)?`<button type="button" class="slot-variant rebirth-path-variant" data-source="${unit.source}" data-name="${x.droid.name}" data-variant="${unit.variant}" data-station="${unit.station||''}" data-slot="${Number.isInteger(unit.slot)?unit.slot:''}" title="Change ${x.droid.name} quality (currently ${unit.variant.toLowerCase()})" aria-label="Change ${x.droid.name} quality (currently ${unit.variant.toLowerCase()})">&#9670;</button>`:'';
    return `<div class="rebirth-path-card-wrap"><a class="rebirth-path-card upgrade" href="#/droid/${slug(x.droid.name)}"><span>${picture(x.droid,x.requirement.variant)}</span><div><strong>${x.droid.name}</strong><small>R ${x.requirement.at} · ${variantText(x.have)} → ${requirementVariantText(x.requirement.variant)}</small><b>${rebirthActionText(x.droid,x.have,x.requirement.variant,x.cost)}</b><em>${activationNeeded(x.have,x.requirement.variant)?'Activate your owned droid at Huyang':x.efficiency?`${fmt(x.efficiency)}/h gained per chip`:'Cheapest owned route'}</em></div></a>${control}</div>`;
  }).join('');
  const missingCards=missing.map(x=>`<a class="rebirth-path-card missing" href="#/droid/${slug(x.droid.name)}"><span>${picture(x.droid,x.requirement.variant)}</span><div><strong>${x.droid.name}</strong><small>R ${x.requirement.at} · ${requirementVariantText(x.requirement.variant)}</small><b>Missing</b><em>Find randomly from quests, missions, or the conveyor</em></div></a>`).join('');
  return `<section class="rebirth-paths"><div class="rebirth-paths-head"><div><p class="eyebrow">Upgrade efficiency</p><h2>Cheapest paths to your goal</h2></div><p>Owned upgrades are ordered by chip cost, then credits gained per chip.</p></div>${upgradeCards?`<div class="rebirth-path-group"><h3>Upgrade these first</h3><div class="rebirth-path-grid">${upgradeCards}</div></div>`:''}${missingCards?`<div class="rebirth-path-group"><h3>Still to find</h3><div class="rebirth-path-grid">${missingCards}</div></div>`:''}</section>`;
}
function rebirthTrackerKey(rebirth,req){return`${state.cycle}:${rebirth}:${req.droidName}:${req.variant}`}
function rebirthTrackerStatus(rebirth,req){
  const d=state.droids.find(x=>x.name===req.droidName),entry=state.rebirthTracker.entries[rebirthTrackerKey(rebirth,req)]||{},selected=d&&entry.variant&&d.variants?.[entry.variant]?entry.variant:null,ready=Boolean(rebirthVariantReady(selected,req.variant,entry.kyberActive)||(entry.complete&&(baseVariant(req.variant)!=='KYBER'||entry.kyberActive))),chips=d&&selected&&!ready?chipsToVariant(d,selected,req.variant):0;
  return{d,entry,selected,ready,chips}
}
function manualRebirthChecked(rebirth){const requirements=rebirth.requiredDroids||[];return Boolean(requirements.length&&requirements.every(req=>{const status=rebirthTrackerStatus(rebirth.to,req);return status.entry.complete&&status.ready}))}
function manualRebirthReady(rebirth){const requirements=rebirth.requiredDroids||[];return Boolean(requirements.length&&requirements.every(req=>rebirthTrackerStatus(rebirth.to,req).ready))}
function manualRebirthSummary(cycle){const ready=[],missing=[];for(const rebirth of cycle){if(manualRebirthReady(rebirth))ready.push(rebirth.to);for(const req of rebirth.requiredDroids||[])if(!rebirthTrackerStatus(rebirth.to,req).ready)missing.push({...req,at:rebirth.to})}return{ready,missing}}
function manualQualityStrip(rebirth,req,d,selected){return `<div class="rebirth-quality-strip" aria-label="Owned quality for ${d.name}">${[...VARIANTS,'SCOURGE'].filter(variant=>d.variants?.[variant]).map(variant=>`<button class="rebirth-quality-option quality-${variant.toLowerCase()} ${baseVariant(selected)===variant?'active':''}" type="button" data-manual-variant="${encodeURIComponent(rebirthTrackerKey(rebirth,req))}" data-variant="${variant}" title="Set ${d.name} to ${variant}" aria-pressed="${baseVariant(selected)===variant}">${variant==='KYBER'?'Kyber':variant}</button>`).join('')}${baseVariant(selected)==='KYBER'?`<label class="rebirth-toggle"><input type="checkbox" data-manual-kyber-active="${encodeURIComponent(rebirthTrackerKey(rebirth,req))}" ${state.rebirthTracker.entries[rebirthTrackerKey(rebirth,req)]?.kyberActive||isActiveKyber(selected)?'checked':''}> Active</label>`:''}</div>`}
// Manual mode's answer to "what have I actually got, and what can go". One row
// per ticked droid rather than one per rebirth that wants it: the quality you
// recorded, whether a later rebirth wants it higher and what that upgrade costs,
// or that nothing in the cycle wants it any more and the slot can be freed.
function manualTrackedPanelHtml(){
  const cycle=state.rebirths[state.cycle]||[],here=manualCurrentRebirth(),rows=new Map();
  for(const rebirth of cycle)for(const req of rebirth.requiredDroids||[]){
    const status=rebirthTrackerStatus(rebirth.to,req);
    if(!status.d||!(status.entry.complete||status.selected))continue;
    const row=rows.get(req.droidName)||{d:status.d,have:null,at:[]};
    // A tick without a quality still tells you the droid met that rebirth.
    const held=status.selected||(status.entry.complete?req.variant:null);
    if(held&&(!row.have||variantRank(held)>variantRank(row.have)))row.have=held;
    row.kyberActive=Boolean(row.kyberActive||status.entry.kyberActive||isActiveKyber(held));row.at.push(rebirth.to);rows.set(req.droidName,row);
  }
  const tracked=[...rows.values()].map(row=>{
    const later=requirementPeak(row.d.name,{after:here});
    const short=Boolean(later&&row.have&&!rebirthVariantReady(row.have,later,row.kyberActive));
    return{...row,later,short,chips:short?chipsToVariant(row.d,row.have,later):0,sellable:!later&&!isIconic(row.d)&&!row.d.special?.cannotSell};
  }).sort((a,b)=>Number(b.short)-Number(a.short)||a.d.name.localeCompare(b.d.name));
  if(!tracked.length)return `<section class="outstanding-panel manual-tracked empty-tracked"><p class="empty">Tick a droid below and it will be summarised here: what you have, what still needs upgrading, and what is safe to sell.</p></section>`;
  const upgrades=tracked.filter(x=>x.short),spare=tracked.filter(x=>x.sellable),settled=tracked.filter(x=>!x.short&&!x.sellable);
  const chipTotal=upgrades.reduce((sum,x)=>sum+x.chips,0);
  const row=x=>`<a class="outstanding-card ${x.short?'upgrade':x.sellable?'spare':'have'}" href="#/droid/${slug(x.d.name)}">${picture(x.d,x.have||'DEFAULT')}<span><strong>${x.d.name}</strong><small>${x.have?`You have ${variantText(x.have)}`:'Ticked'} &middot; ${rarityText(x.d.rarity)}</small><em>${x.short?`Needs ${requirementVariantText(x.later)} by R: ${requirementSchedule(x.d.name,{after:here}).find(s=>s.variant===x.later)?.at??'?'} &middot; ${rebirthActionText(x.d,x.have,x.later,x.chips)}`:x.sellable?`Nothing after R: ${here} needs it &middot; sells for ${fmt(chipSellValue(x.d,x.have||'DEFAULT'))} chips`:`Covered through R: ${rebirthGoal()}`}</em></span></a>`;
  const group=(title,list,note)=>list.length?`<section><h4>${title}</h4><div class="outstanding-grid">${list.map(row).join('')}</div>${note?`<small class="outstanding-note">${note}</small>`:''}</section>`:'';
  const open=localStorage.getItem('droid-archive-manual-tracked-open')!=='0';
  return `<details class="outstanding-panel manual-tracked" id="manualTrackedPanel" ${open?'open':''}><summary><span><strong>What you have ticked</strong><small>${tracked.length} droid${tracked.length===1?'':'s'} &middot; ${upgrades.length} still to upgrade${chipTotal?` (${fmt(chipTotal)} chips)`:''} &middot; ${spare.length} safe to sell</small></span></summary><div class="outstanding-body">${group('Upgrade these for a later rebirth',upgrades,`Costed from the quality you recorded, through your R: ${rebirthGoal()} max.`)}${group('Safe to sell',spare,`Counted from R: ${here}, the furthest rebirth you have completed.`)}${group('Ticked and covered',settled)}</div></details>`;
}
// The furthest rebirth ticked off in the manual tracker. Manual mode ignores the
// Base, so "where am I" cannot come from state.rebirth; it comes from the ticks.
function manualCurrentRebirth(){
  if(Number.isFinite(state.rebirthTracker.currentByCycle?.[state.cycle]))return state.rebirthTracker.currentByCycle[state.cycle];
  return (state.rebirths[state.cycle]||[]).filter(manualRebirthChecked).reduce((max,r)=>Math.max(max,r.to),0);
}
function manualRequirementCard(rebirth,req){
  const status=rebirthTrackerStatus(rebirth,req),{d,entry,selected,ready,chips}=status;if(!d)return'';
  const stateClass=ready?'have':selected?'upgrade':'missing',statusText=entry.complete&&ready?'&#10003; Have it':ready?'&#10003; Ready':selected?rebirthActionText(d,selected,req.variant,chips):'Select the quality you have';
  // Past this rebirth: does anything still want the droid, and at what quality?
  // Without this the tracker can only answer "is it enough for this one rebirth",
  // which is what sends people to a spreadsheet to work out what is safe to sell.
  const later=requirementPeak(d.name,{after:rebirth}),held=selected||(entry.complete?req.variant:null);
  const laterShort=later&&held&&!rebirthVariantReady(held,later,entry.kyberActive);
  const sellable=!isIconic(d)&&!d.special?.cannotSell&&!later;
  const laterNote=later?`<em class="manual-later${laterShort?' short':''}">Later needs ${requirementVariantText(later)}${laterShort?` &middot; ${rebirthActionText(d,held,later,chipsToVariant(d,held,later))}`:held?' &middot; covered':''}</em>`:'';
  return `<div class="manual-rebirth-requirement">${manualQualityStrip(rebirth,req,d,selected)}<article class="needed-card rebirth-req-card manual ${stateClass}${sellable?' sell-after':''}" data-needed-name="${d.name.toLowerCase()}"><label class="manual-droid-check" title="Mark ${d.name} as owned"><input type="checkbox" data-manual-complete="${encodeURIComponent(rebirthTrackerKey(rebirth,req))}" ${entry.complete&&ready?'checked':''}><span aria-hidden="true">&#10003;</span></label><a class="manual-rebirth-droid" href="#/droid/${slug(d.name)}"><div>${picture(d,selected||req.variant)}</div><span><strong>${d.name}</strong><small>Needs ${requirementVariantText(req.variant)} &middot; ${rarityText(d.rarity)}</small>${laterNote}</span></a><b>${statusText}</b>${sellable?`<span class="needed-sell" title="Nothing after Rebirth ${rebirth} needs ${d.name}, so it can be sold once this rebirth is done" aria-label="Sellable after Rebirth ${rebirth}">$</span>`:''}</article></div>`
}
function legacyRebirthPage(){
  const cycle=state.rebirths[state.cycle]||[],summary=fullCycleRebirthSummary(),ownedCount=state.owned.reduce((s,x)=>s+x.qty,0),showCompleted=localStorage.getItem('droid-archive-show-completed-rebirths')!=='0',visibleCycle=showCompleted?cycle:cycle.filter(r=>r.to>state.rebirth);
  const reqCard=req=>{const d=state.droids.find(x=>x.name===req.droidName),have=bestOwnedVariant(req.droidName),ready=hasRequirement(req),needsUpgrade=have&&!ready,chips=needsUpgrade?chipsToVariant(d,have,req.variant):0;if(!d)return'';return `<a class="needed-card rebirth-req-card ${ready?'have':needsUpgrade?'upgrade':'missing'}" href="#/droid/${slug(d.name)}" data-needed-name="${d.name.toLowerCase()}"><div>${picture(d,req.variant)}</div><span><strong>${d.name}</strong><small>${requirementVariantText(req.variant)} &middot; ${rarityText(d.rarity)}</small>${have?`<em>Best owned: ${variantText(have)}</em>`:''}</span><b>${ready?'&#10003; Ready':needsUpgrade?rebirthActionText(d,have,req.variant,chips):'Needed'}</b></a>`};
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Rebirth</div><section class="rebirth-hero"><div><p class="eyebrow">Cycle ${state.cycle+1} rebirth guide</p><h1>Rebirth</h1><p class="lead">Full rebirth requirements for the selected Super Rebirth cycle. Toggle completed rebirths if you only want to see what is still ahead.</p></div><div class="rebirth-hero-stats"><strong>${ownedCount}</strong><span>droids owned</span><strong>${rebirthGoal()}</strong><span>Base goal</span></div></section><section class="rebirth-summary-box rebirth-page-summary"><div><p class="eyebrow">Your outlook</p><strong>${summary.ready.length?`Ready rebirths: R ${summary.ready.join(', R ')}`:'No future rebirth is fully ready yet'}</strong><span>${summary.missing.length?`Still missing ${summary.missing.length} requirement${summary.missing.length===1?'':'s'} across the full cycle.`:'You have every listed droid for the rest of this cycle.'}</span></div><label class="rebirth-toggle"><input id="toggleCompletedRebirths" type="checkbox" ${showCompleted?'checked':''}> Show completed rebirths</label></section>${rebirthCheapestPathsHtml(cycle)}<div class="rebirth-cycle-list">${visibleCycle.map(r=>{const ready=rebirthReadiness(r),past=r.to<=state.rebirth,overGoal=r.to>rebirthGoal();return `<section class="rebirth-detail-group ${ready?'ready':''} ${past?'past':''} ${overGoal?'over-goal':''}"><header><div><h2>Rebirth: ${r.to}</h2><small>${past?'Already completed':overGoal?'Past Base goal':'Within Base goal'}</small></div>${creditAmount(r.creditsCost)}</header><div class="needed-grid">${(r.requiredDroids||[]).map(reqCard).join('')}</div></section>`}).join('')||'<div class="empty">Completed rebirths are hidden. Toggle them back on to see earlier requirements.</div>'}</div>`;
  document.querySelector('#toggleCompletedRebirths')?.addEventListener('change',e=>{localStorage.setItem('droid-archive-show-completed-rebirths',e.target.checked?'1':'0');rebirthPage()})
}
// A tree follows one physical copy through its qualities; requirements remain
// visible after selling so reacquisition never looks like completed progress.
function rebirthTreeCurrent(){return state.rebirthTracker.notUsingBase?(state.rebirthTracker.currentByCycle?.[state.cycle]??manualCurrentRebirth()):state.rebirth}
function rebirthTreeRows(){
  const manual=state.rebirthTracker.notUsingBase,here=rebirthTreeCurrent();
  const names=[...new Set((state.rebirths[state.cycle]||[]).flatMap(r=>(r.requiredDroids||[]).map(q=>q.droidName)))];
  return names.map(name=>{
    const d=state.droids.find(d=>d.name===name);if(!d)return null;
    const schedule=requirementSchedule(name,{through:Infinity});
    const tracked=schedule.map(q=>{const status=rebirthTrackerStatus(q.at,{droidName:name,variant:q.variant});return{...status,held:status.selected||(status.entry.complete?q.variant:null)}}).filter(s=>s.held).sort((a,b)=>variantRank(b.held)-variantRank(a.held));
    const fallback=tracked[0],have=manual?fallback?.held:bestOwnedVariant(name);
    const active=manual?Boolean(fallback?.entry.kyberActive||isActiveKyber(have)):isActiveKyber(have);
    const source=manual?-1:state.owned.findIndex(u=>u.name===name&&u.variant===have&&u.qty>0);
    const last=Math.max(...schedule.map(q=>q.at)),future=schedule.filter(q=>q.at>here),peak=Math.max(...schedule.map(q=>variantRank(q.variant)),variantRank(have));
    const variants=VARIANTS.filter((v,i)=>i<=peak&&d.variants?.[v]);
    return{d,have,active,source,schedule,last,future,variants};
  }).filter(Boolean).sort((a,b)=>a.schedule[0].at-b.schedule[0].at||a.d.name.localeCompare(b.d.name));
}
const rebirthTrackerFilters={query:'',status:[],rarity:[],type:[]};
function rebirthTrackerSummary(rows){
  const here=rebirthTreeCurrent(),goal=rebirthGoal(),cycle=(state.rebirths[state.cycle]||[]).filter(r=>r.to>here&&r.to<=goal);
  const byName=new Map(rows.map(row=>[row.d.name,row]));
  const ready=cycle.filter(r=>(r.requiredDroids||[]).every(req=>{const row=byName.get(req.droidName);return row&&rebirthVariantReady(row.have,req.variant,row.active)})).length;
  const costThrough=through=>rows.reduce((sum,row)=>{const peak=row.future.filter(q=>q.at<=through).sort((a,b)=>variantRank(b.variant)-variantRank(a.variant))[0];return sum+(row.have&&peak?chipsToVariant(row.d,row.have,peak.variant):0)},0);
  return{ready,total:cycle.length,nextChips:costThrough(cycle[0]?.to??here),goalChips:costThrough(goal),missing:rows.filter(row=>!row.have&&row.future.some(q=>q.at<=goal)).length,sell:rows.filter(row=>row.have&&!row.future.length&&!isIconic(row.d)&&!row.d.special?.cannotSell).length};
}
function rebirthCollectionHtml(rows){
  return `<div class="rebirth-collection-grid">${rows.map(row=>{
    const {d,have,future,last,active}=row,next=future[0],covered=next&&rebirthVariantReady(have,next.variant,active),canSell=have&&!isIconic(d)&&!d.special?.cannotSell;
    return `<article class="rebirth-collection-card" data-tree-name="${escapeAttr(d.name)}"><header>${picture(d,have||'DEFAULT')}<div><h3>${d.name}</h3><small>${rarityText(d.rarity)} &middot; ${d.type}</small></div></header><div class="rebirth-quality-buttons" role="group" aria-label="Owned quality for ${escapeAttr(d.name)}">${[...[...VARIANTS,'SCOURGE'].filter(v=>d.variants?.[v]),...(baseVariant(have)==='KYBER'?OWNED_VARIANTS.filter(isActiveKyber):[])].map(v=>`<button type="button" class="quality-swatch" data-tracker-quality="${escapeAttr(d.name)}" data-variant="${v}" aria-label="${escapeAttr(v.replaceAll('_',' '))}" title="${escapeAttr(v.replaceAll('_',' '))}" aria-pressed="${have===v}"><span aria-hidden="true">${have===v?'&#10003;':''}</span></button>`).join('')}</div><small class="rebirth-selected-quality">${have?variantText(have):'No variant selected'}</small><div class="rebirth-collection-schedule" aria-label="Rebirth requirements">${row.schedule.map(q=>`<span class="${q.at<=rebirthTreeCurrent()?'past':''}">R ${q.at} · ${requirementVariantText(q.variant)}</span>`).join('')}</div><div class="rebirth-collection-actions">${next&&have&&!covered?`<button class="btn secondary" ${variantRank(have)<variantRank(next.variant)?`data-tree-upgrade="${escapeAttr(d.name)}" data-variant="${next.variant}"`:`data-tracker-activate="${escapeAttr(d.name)}"`}>${variantRank(have)<variantRank(next.variant)?'Record upgrade':'Record activation'}</button>`:''}${canSell?`<button class="btn secondary" data-tree-sell="${escapeAttr(d.name)}">${future.length?'Sell now & reacquire later':'Sell'} · ${fmt(chipSellValue(d,have))} chips</button>`:''}</div><small>${future.length?`Keep through R ${last}${last>rebirthGoal()?' · needed beyond your goal':''}`:canSell?'No longer needed for rebirths - you can sell this droid.':'Finished for this cycle’s rebirths'}</small></article>`;
  }).join('')}</div>`;
}
function rebirthDroidTrackerHtml(treeView,showCompleted){
  const rows=rebirthTreeRows(),summary=rebirthTrackerSummary(rows),here=rebirthTreeCurrent();
  const select=(label,key,values)=>`<fieldset class="rebirth-multi-filter"><legend>${label}</legend><div><button type="button" data-tracker-filter="${key}" data-value="" aria-pressed="${!rebirthTrackerFilters[key].length}">All</button>${values.map(item=>{const [value,text]=Array.isArray(item)?item:[item,item];return `<button type="button" data-tracker-filter="${key}" data-value="${value}" aria-pressed="${rebirthTrackerFilters[key].includes(value)}">${text}</button>`}).join('')}</div></fieldset>`;
  return `<section class="rebirth-droid-tracker"><header class="rebirth-tracker-heading"><div><p class="eyebrow">Collect · Upgrade · Rebirth</p><h2>Droid Tracker</h2><p>Droids needed for upcoming rebirths are shown, along with owned droids you can sell after their final requirement. Collection and skill tree share the same progress. Select a colour to mark its variant owned; click it again to clear ownership.</p></div><label class="rebirth-toggle"><input id="toggleRebirthTree" type="checkbox" ${treeView?'checked':''}> Skill Tree view</label></header><details class="rebirth-tracker-overview" id="rebirthTrackerOverview" ${localStorage.getItem('droid-archive-tracker-overview-open')!=='0'?'open':''}><summary>Tracker overview</summary><div class="rebirth-tracker-metrics"><div><strong>${rows.filter(row=>row.have).length}/${rows.length}</strong><span>Droids owned</span></div><div><strong>${summary.ready}/${summary.total}</strong><span>Ready to goal</span></div><div><strong>${summary.nextChips?fmt(summary.nextChips):0}</strong><span>Upgrade chips · next rebirth</span></div><div><strong>${summary.goalChips?fmt(summary.goalChips):0}</strong><span>Upgrade chips · to goal</span></div><div><strong>${summary.missing}</strong><span>To find for goal</span></div><div><strong>${summary.sell}</strong><span>Finished with rebirths</span></div></div><details class="rebirth-tracker-explainer"><summary>How totals work</summary><p class="rebirth-tracker-help">Chip totals cover upgrades to owned droids; missing droids and Kyber activation crystals are separate. Sell guidance checks the entire cycle, including rebirths beyond your goal. Other uses such as income, fusion and Droidex may still need them. Actions update ${state.rebirthTracker.notUsingBase?'your manual tracker':'your Base'}.</p></details></details><div class="rebirth-tracker-toolbar"><label>Current rebirth<select id="treeCurrentRebirth">${Array.from({length:maxRebirth()+1},(_,n)=>`<option value="${n}" ${n===here?'selected':''}>${n}</option>`).join('')}</select></label><label class="rebirth-tracker-search">Search droids<input id="rebirthTrackerSearch" type="search" placeholder="Name, e.g. LO or Pit" value="${escapeAttr(rebirthTrackerFilters.query)}"></label>${select('Status','status',[['missing','Not Owned'],['upgrade','Needs Upgrade / Activation'],['ready','Ready for Next Use'],['finished','Finished with Rebirths']])}${select('Rarities','rarity',[...new Set(rows.map(row=>row.d.rarity))].sort((a,b)=>RARITY_LADDER.indexOf(a)-RARITY_LADDER.indexOf(b)))}${select('Types','type',[...new Set(rows.map(row=>row.d.type))])}</div><p id="rebirthTrackerCount" role="status"></p>${treeView?rebirthTreeHtml(showCompleted):rebirthCollectionHtml(rows.filter(row=>row.future.length||row.have))}<p id="rebirthTrackerEmpty" class="empty" hidden>No droids match these filters.</p></section>`;
}
function groupRebirthTrackerCards(){
  const grid=document.querySelector('.rebirth-collection-grid,.rebirth-tree-grid');if(!grid)return;
  const rows=new Map(rebirthTreeRows().map(row=>[row.d.name,row])),groups=new Map();
  for(const card of [...grid.querySelectorAll('[data-tree-name]')]){
    const rarity=rows.get(card.dataset.treeName).d.rarity;
    if(!groups.has(rarity))groups.set(rarity,[]);groups.get(rarity).push(card);
  }
  grid.classList.add('rebirth-grouped-grid');
  for(const rarity of [...groups.keys()].sort((a,b)=>(RARITY_LADDER.indexOf(a)<0?99:RARITY_LADDER.indexOf(a))-(RARITY_LADDER.indexOf(b)<0?99:RARITY_LADDER.indexOf(b)))){
    const group=document.createElement('section');group.dataset.trackerRarityGroup=rarity;
    group.innerHTML=`<h3 class="rebirth-rarity-heading">${rarityText(rarity)} <span data-rarity-count>${groups.get(rarity).length}</span></h3><div class="rebirth-rarity-row" role="region" aria-label="${escapeAttr(rarity)} droids"></div>`;
    group.querySelector('.rebirth-rarity-row').append(...groups.get(rarity));grid.append(group);
  }
}
function attachRebirthTrackerHandlers(){
  document.querySelector('#rebirthTrackerOverview')?.addEventListener('toggle',e=>localStorage.setItem('droid-archive-tracker-overview-open',e.target.open?'1':'0'));
  groupRebirthTrackerCards();
  attachRebirthTreeHandlers();
  const rows=new Map(rebirthTreeRows().map(row=>[row.d.name,row]));
  const filter=()=>{
    let count=0;document.querySelectorAll('[data-tree-name]').forEach(card=>{
      const row=rows.get(card.dataset.treeName),next=row.future[0],ready=next&&rebirthVariantReady(row.have,next.variant,row.active),f=rebirthTrackerFilters;
      const status=!row.have?'missing':!next?'finished':ready?'ready':'upgrade';
      const matches=row.d.name.toLowerCase().includes(f.query.trim().toLowerCase())&&(!f.rarity.length||f.rarity.includes(row.d.rarity))&&(!f.type.length||f.type.includes(row.d.type))&&(!f.status.length||f.status.includes(status));
      card.hidden=!matches;if(matches)count++;
    });
    document.querySelectorAll('[data-tracker-rarity-group]').forEach(group=>{const shown=[...group.querySelectorAll('[data-tree-name]')].filter(card=>!card.hidden).length;group.hidden=!shown;group.querySelector('[data-rarity-count]').textContent=String(shown)});
    document.querySelector('#rebirthTrackerCount').textContent=`${count} droid${count===1?'':'s'} shown`;
    document.querySelector('#rebirthTrackerEmpty').hidden=count>0;
  };
  document.querySelector('#rebirthTrackerSearch').oninput=e=>{rebirthTrackerFilters.query=e.target.value;filter()};
  document.querySelectorAll('[data-tracker-filter]').forEach(button=>button.onclick=()=>{
    const key=button.dataset.trackerFilter,value=button.dataset.value,selected=rebirthTrackerFilters[key];
    rebirthTrackerFilters[key]=!value?[]:selected.includes(value)?selected.filter(v=>v!==value):[...selected,value];
    document.querySelectorAll(`[data-tracker-filter="${key}"]`).forEach(option=>option.setAttribute('aria-pressed',String(option.dataset.value?rebirthTrackerFilters[key].includes(option.dataset.value):!rebirthTrackerFilters[key].length)));
    filter();
  });
  document.querySelectorAll('[data-tracker-quality]').forEach(button=>button.onclick=()=>setRebirthTreeVariant(rows.get(button.dataset.trackerQuality),button.getAttribute('aria-pressed')==='true'?null:button.dataset.variant,isActiveKyber(button.dataset.variant)));
  document.querySelectorAll('[data-tracker-activate]').forEach(button=>button.onclick=()=>{
    const row=rows.get(button.dataset.trackerActivate);if(state.sharedView&&!state.sharedView.canEdit)return;
    if(state.rebirthTracker.notUsingBase)setRebirthTreeVariant(row,'KYBER',true);
    else{const unit=placements().placed.find(u=>u.source===row.source);showCardVariantModal({source:row.source,name:row.d.name,variant:row.have,station:unit?.station,slot:unit?.slot},rebirthPage)}
  });
  filter();
}
function rebirthTreeHtml(showCompleted){
  const rows=rebirthTreeRows().filter(row=>row.future.length||row.have),here=rebirthTreeCurrent();
  return `<section class="rebirth-skill-tree"><p class="rebirth-tracker-help">Follow each path from top to bottom. Check the quality you own; connected nodes show each upgrade cost.</p><div class="rebirth-tree-grid">${rows.map(row=>{
    const {d,have,schedule,last,future,variants}=row,sellable=!isIconic(d)&&!d.special?.cannotSell;
    return `<article class="rebirth-tree" data-tree-name="${escapeAttr(d.name)}"><header>${picture(d,have||'DEFAULT')}<div><h3>${d.name}</h3><small>${rarityText(d.rarity)}</small><p>${have?`Owned: ${variantText(have)}`:'Not owned'}</p></div></header><ol>${variants.map((v,i)=>{
      const uses=schedule.filter(q=>baseVariant(q.variant)===v),covered=rebirthVariantReady(have,v,row.active),current=baseVariant(have)===v,previous=variants[i-1];
      return `<li class="${covered?'covered':''} ${current?'current':''}">${i?`<div class="rebirth-tree-edge">${fmt(chipsToVariant(d,previous,v))} chips</div>`:''}<div class="rebirth-tree-node quality-${v.toLowerCase()}"><label><input type="checkbox" data-tree-check="${escapeAttr(d.name)}" data-variant="${v}" ${covered?'checked':''} ${covered&&!current?'disabled':''}><strong>${variantText(v)}</strong></label><small>${uses.length?`Required: ${uses.map(q=>`R ${q.at}${q.at<=here?' ✓':''}`).join(', ')}`:'Upgrade step'}</small>${have&&!covered&&variantRank(v)>variantRank(have)?`<span>${fmt(chipsToVariant(d,have,v))} chips from owned</span><button class="btn secondary" data-tree-upgrade="${escapeAttr(d.name)}" data-variant="${v}">Upgrade to ${variantText(v)}</button>`:''}${v==='KYBER'&&current?`<label><input type="checkbox" data-tree-active="${escapeAttr(d.name)}" ${row.active?'checked':''}> Activated at Huyang</label><small>${rebirthActionText(d,have,'KYBER',0)}</small>`:''}</div></li>`;
    }).join('')}</ol><footer><strong>${future.length?`Keep until after R ${last}`:`No further rebirth needs this droid`}</strong><p>${future.length?`Next needed: R ${future[0].at} · ${requirementVariantText(future[0].variant)}`:`Last needed at R ${last}. ${sellable?'Can sell for rebirth purposes.':'This droid cannot be sold.'}`}</p>${have&&sellable?`<button class="btn ${future.length?'secondary':''}" data-tree-sell="${escapeAttr(d.name)}">${future.length?'Sell now & reacquire later':'Sell'} · ${fmt(chipSellValue(d,have))} chips</button>`:''}</footer></article>`;
  }).join('')||'<p class="empty">No remaining droid requirements in this cycle.</p>'}</div></section>`;
}
function setRebirthTreeVariant(row,variant,active=false){
  if(state.sharedView&&!state.sharedView.canEdit)return;
  if(state.rebirthTracker.notUsingBase){
    state.rebirthTracker.currentByCycle||={};
    state.rebirthTracker.currentByCycle[state.cycle]=rebirthTreeCurrent();
    for(const q of row.schedule){const key=rebirthTrackerKey(q.at,{droidName:row.d.name,variant:q.variant});state.rebirthTracker.entries[key]={...(variant?{variant}:{}),complete:false,kyberActive:active}}
    save();rebirthPage();
  }else if(!variant){removeOwnedUnit(row.source);rebirthPage()}
  else if(row.source>=0){const unit=placements().placed.find(u=>u.source===row.source),owned=state.owned[row.source];changeOwnedUnitVariant(row.source,variant,unit?.station||owned.preferred,unit?.slot??owned.preferredSlot);rebirthPage()}
  else requestAdd(row.d.name,variant,1,rebirthPage);
}
function attachRebirthTreeHandlers(){
  const rowFor=name=>rebirthTreeRows().find(row=>row.d.name===name);
  document.querySelector('#treeCurrentRebirth')?.addEventListener('change',e=>{if(state.sharedView&&!state.sharedView.canEdit)return;if(state.rebirthTracker.notUsingBase){state.rebirthTracker.currentByCycle||={};state.rebirthTracker.currentByCycle[state.cycle]=Number(e.target.value)}else state.rebirth=Number(e.target.value);save();route()});
  document.querySelectorAll('[data-tree-check]').forEach(input=>input.onchange=()=>setRebirthTreeVariant(rowFor(input.dataset.treeCheck),input.checked?input.dataset.variant:null));
  document.querySelectorAll('[data-tree-upgrade]').forEach(button=>button.onclick=()=>setRebirthTreeVariant(rowFor(button.dataset.treeUpgrade),button.dataset.variant));
  document.querySelectorAll('[data-tree-active]').forEach(input=>input.onchange=()=>{const row=rowFor(input.dataset.treeActive);if(state.sharedView&&!state.sharedView.canEdit)return;if(state.rebirthTracker.notUsingBase)setRebirthTreeVariant(row,'KYBER',input.checked);else{const unit=placements().placed.find(u=>u.source===row.source);showCardVariantModal({source:row.source,name:row.d.name,variant:row.have,station:unit?.station,slot:unit?.slot},rebirthPage)}});
  document.querySelectorAll('[data-tree-sell]').forEach(button=>button.onclick=()=>setRebirthTreeVariant(rowFor(button.dataset.treeSell),null));
}
function rebirthPage(){
  const rebirthPath=location.hash.slice(1).split('?')[0];
  const trackerView=rebirthPath==='/rebirth/tracker'||rebirthPath==='/rebirth/tracker/skilltree'||rebirthPath==='/rebirth'&&(localStorage.getItem('droid-archive-rebirth-section')||'tracker')==='tracker';
  const treeView=rebirthPath==='/rebirth/tracker/skilltree'||rebirthPath==='/rebirth'&&trackerView&&localStorage.getItem('droid-archive-rebirth-tree')==='1';
  if(rebirthPath==='/rebirth')history.replaceState(history.state,'',`#/rebirth/${trackerView?`tracker${treeView?'/skilltree':''}`:'reqs'}`);
  const cycle=state.rebirths[state.cycle]||[],manual=state.rebirthTracker.notUsingBase,summary=manual?manualRebirthSummary(cycle):fullCycleRebirthSummary(),ownedCount=manual&&trackerView?rebirthTreeRows().filter(row=>row.have).length:manual?Object.entries(state.rebirthTracker.entries).filter(([key,value])=>key.startsWith(`${state.cycle}:`)&&value.complete).length:state.owned.reduce((s,x)=>s+x.qty,0),showCompleted=localStorage.getItem('droid-archive-show-completed-rebirths')!=='0',visibleCycle=showCompleted?cycle:cycle.filter(r=>manual?!manualRebirthChecked(r):r.to>state.rebirth);
  // The Base list and this page draw the same card, so an add or a quality change
  // works the same in both places. Manual mode has its own card because it tracks
  // qualities you tick rather than droids standing in your Base.
  const placedNow=manual?null:placements(),located=manual?null:requirementLocations(),units=manual?null:requirementUnits(placedNow);
  const reqCard=(req,rebirth)=>manual?manualRequirementCard(rebirth,req):neededCardHtml(req,{located,units,rebirth,className:'rebirth-req-card'});
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Rebirth</div><section class="rebirth-hero"><div><p class="eyebrow">Cycle ${state.cycle+1} rebirth guide</p><h1>Rebirth</h1><p class="lead">${manual?'Manually track the droids and qualities you have without changing your Base.':'Full rebirth requirements for the selected Super Rebirth cycle. Toggle completed rebirths if you only want to see what is still ahead.'}</p></div><div class="rebirth-hero-stats"><strong>${ownedCount}</strong><span>${manual?'droids checked':'droids owned'}</span><strong>${rebirthGoal()}</strong><span>Base goal</span></div></section><section class="rebirth-summary-box rebirth-page-summary"><div><p class="eyebrow">Your outlook</p><strong>${summary.ready.length?`Ready rebirths: R ${summary.ready.join(', R ')}`:'No rebirth is fully ready yet'}</strong><span>${summary.missing.length?`Still missing ${summary.missing.length} requirement${summary.missing.length===1?'':'s'} across the full cycle.`:'You have every listed droid for this cycle.'}</span></div><div class="rebirth-summary-controls"><label class="rebirth-toggle manual-mode-toggle"><input id="toggleManualRebirth" type="checkbox" ${manual?'checked':''}> Not using Base</label><label class="rebirth-toggle" ${trackerView?'hidden':''}><input id="toggleCompletedRebirths" type="checkbox" ${showCompleted?'checked':''}> Show completed rebirths</label></div></section><div class="rebirth-view-tabs" aria-label="Rebirth view"><a class="btn ${trackerView?'secondary':''}" href="#/rebirth/reqs" data-rebirth-section="requirements" ${!trackerView?'aria-current="page"':''}>Rebirth requirements</a><a class="btn ${trackerView?'':'secondary'}" href="#/rebirth/tracker" data-rebirth-section="tracker" ${trackerView?'aria-current="page"':''}>Droid Tracker</a></div>${trackerView?rebirthDroidTrackerHtml(treeView,showCompleted):manual?manualTrackedPanelHtml():rebirthCheapestPathsHtml(cycle)}<div ${trackerView?'hidden':''} class="rebirth-cycle-list ${manual?'manual-tracker':''}">${visibleCycle.map(r=>{const ready=manual?manualRebirthReady(r):rebirthReadiness(r),completed=manual?manualRebirthChecked(r):r.to<=state.rebirth,past=manual?completed:r.to<=state.rebirth,overGoal=r.to>rebirthGoal();return `<section class="rebirth-detail-group ${ready?'ready':''} ${past?'past':''} ${overGoal?'over-goal':''}"><header><div><div class="rebirth-title-row"><h2>Rebirth: ${r.to}</h2>${manual?`<label class="rebirth-group-complete" title="Mark every droid in Rebirth ${r.to} as owned"><input type="checkbox" data-rebirth-complete="${r.to}" ${completed?'checked':''}><span>Complete rebirth</span></label>`:''}</div><small>${manual?(completed?'Completed':overGoal?'Past Base goal':'Manual tracker'):past?'Already completed':overGoal?'Past Base goal':'Within Base goal'}</small></div><span class="rebirth-group-rewards">${rebirthRewardHtml(r.to)}${creditAmount(r.creditsCost)}</span></header><div class="needed-grid">${(r.requiredDroids||[]).map(req=>reqCard(req,r.to)).join('')}</div></section>`}).join('')||'<div class="empty">Completed rebirths are hidden. Toggle them back on to see earlier requirements.</div>'}</div>`;
  document.querySelectorAll('[data-rebirth-section]').forEach(button=>button.onclick=()=>{localStorage.setItem('droid-archive-rebirth-section',button.dataset.rebirthSection)});
  document.querySelector('#toggleRebirthTree')?.addEventListener('change',e=>{localStorage.setItem('droid-archive-rebirth-tree',e.target.checked?'1':'0');location.hash=e.target.checked?'#/rebirth/tracker/skilltree':'#/rebirth/tracker'});
  if(trackerView)attachRebirthTrackerHandlers();
  // The Base sidebar already carries this setting, but the decision of how far to
  // push before a Super Rebirth is made while reading this page, so it is here too.
  document.querySelector('.rebirth-summary-controls')?.insertAdjacentHTML('afterbegin',`<label class="manual-cycle-picker"><span>Max rebirth</span><select id="rebirthGoalSelect" aria-label="Max rebirth">${Array.from({length:Math.max(0,maxRebirth()-11)},(_,i)=>i+12).map(n=>`<option value="${n}" ${n===rebirthGoal()?'selected':''}>Rebirth ${n}</option>`).join('')}</select></label>`);
  document.querySelector('#rebirthGoalSelect')?.addEventListener('change',e=>{state.superRebirthGoal=Number(e.target.value)||maxRebirth();save();rebirthPage()});
  document.querySelector('#manualTrackedPanel')?.addEventListener('toggle',e=>localStorage.setItem('droid-archive-manual-tracked-open',e.target.open?'1':'0'));
  if(manual)document.querySelector('.rebirth-summary-controls')?.insertAdjacentHTML('afterbegin',`<label class="manual-cycle-picker"><span>Super Rebirth cycle</span><select id="manualCycleSelect" aria-label="Super Rebirth cycle">${Object.keys(state.rebirths).sort((a,b)=>Number(a)-Number(b)).map(key=>`<option value="${key}" ${Number(key)===state.cycle?'selected':''}>Cycle ${Number(key)+1}</option>`).join('')}</select></label>`);
  document.querySelector('#manualCycleSelect')?.addEventListener('change',e=>{state.cycle=Number(e.target.value);save();rebirthPage()});
  document.querySelector('#toggleManualRebirth')?.addEventListener('change',e=>{state.rebirthTracker.notUsingBase=e.target.checked;save();rebirthPage()});
  document.querySelector('#toggleCompletedRebirths')?.addEventListener('change',e=>{localStorage.setItem('droid-archive-show-completed-rebirths',e.target.checked?'1':'0');rebirthPage()});
  document.querySelectorAll('[data-manual-variant]').forEach(button=>button.onclick=()=>{const key=decodeURIComponent(button.dataset.manualVariant),current=state.rebirthTracker.entries[key]||{},variant=current.variant===button.dataset.variant?null:button.dataset.variant;state.rebirthTracker.entries[key]={...current,...(variant?{variant}:{}),complete:false,kyberActive:false};if(!variant)delete state.rebirthTracker.entries[key].variant;save();rebirthPage()});
  document.querySelectorAll('[data-manual-kyber-active]').forEach(input=>input.onchange=()=>{const key=decodeURIComponent(input.dataset.manualKyberActive),current=state.rebirthTracker.entries[key]||{};state.rebirthTracker.entries[key]={...current,variant:'KYBER',kyberActive:input.checked,complete:false};save();rebirthPage()});
  document.querySelectorAll('[data-manual-complete]').forEach(input=>input.onchange=()=>{const key=decodeURIComponent(input.dataset.manualComplete),current=state.rebirthTracker.entries[key]||{};state.rebirthTracker.entries[key]={...current,complete:input.checked,kyberActive:input.checked&&key.endsWith(':KYBER')?true:Boolean(current.kyberActive)};save();rebirthPage()});
  document.querySelectorAll('[data-rebirth-complete]').forEach(input=>input.onchange=()=>{const rebirth=cycle.find(r=>r.to===Number(input.dataset.rebirthComplete));for(const req of rebirth?.requiredDroids||[]){const key=rebirthTrackerKey(rebirth.to,req),current=state.rebirthTracker.entries[key]||{};state.rebirthTracker.entries[key]={...current,complete:input.checked,kyberActive:input.checked&&req.variant==='KYBER'?true:Boolean(current.kyberActive)}}save();rebirthPage()});
  document.querySelectorAll('.rebirth-path-variant').forEach(button=>button.onclick=()=>showCardVariantModal({source:Number(button.dataset.source),name:button.dataset.name,variant:button.dataset.variant,station:button.dataset.station,slot:Number(button.dataset.slot)},rebirthPage));
  attachNeededCardHandlers(rebirthPage);
}
async function groupsPage(){
  if(!location.hash.startsWith('#/groups'))return;
  if(state.sharedView)await exitSharedProfile(false);
  if(!location.hash.startsWith('#/groups'))return;
  if(!cloudConnected()){
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Groups</div><section class="groups-hero"><div><p class="eyebrow">Connected accounts</p><h1>Groups</h1><p class="lead">Connect Droid Archives accounts, share selected profiles, and combine their Rebirth Outlooks.</p></div><button class="btn" id="groupsSignIn">Sign in to use groups</button></section><div class="notice">Groups use your Droid Archives cloud account. Local-only profiles cannot be shared until you sign in.</div>`;
    document.querySelector('#groupsSignIn').onclick=()=>showAuthModal('signin');
    return
  }
  if(!state.groups.loaded&&!state.groups.loading){app.innerHTML='<div class="loading">Loading groups…</div>';try{await loadGroupWorkspace()}catch{}if(!location.hash.startsWith('#/groups'))return;return groupsPage()}
  if(state.groups.loading){app.innerHTML='<div class="loading">Loading groups…</div>';return}
  let activeGroupId=localStorage.getItem('droid-archive-active-group')||state.groups.workspace[0]?.id||'',activeGroup=state.groups.workspace.find(group=>group.id===activeGroupId)||state.groups.workspace[0];
  if(activeGroup){activeGroupId=activeGroup.id;localStorage.setItem('droid-archive-active-group',activeGroupId)}
  const selection=groupOutlookSelection(),ownId=state.cloud.user.id,profileRows=activeGroup?(state.cloud.doc?.profiles||[]).map(profile=>{const share=activeGroup.profiles?.find(item=>item.ownerId===ownId&&item.profileId===profile.id),key=groupProfileKey(activeGroup.id,ownId,profile.id),selected=selection===null||selection.has(key);return`<article class="group-share-row"><div><strong>${escapeAttr(profile.name)}</strong><small>Updated ${profile.updatedAt?new Date(profile.updatedAt).toLocaleString():'recently'}</small></div><label><input type="checkbox" data-group-outlook-profile="${escapeAttr(profile.id)}" ${selected?'checked':''}> Outlook</label><label><input type="checkbox" data-group-share="${escapeAttr(profile.id)}" ${share?'checked':''}> Share</label><label><input type="checkbox" data-group-edit="${escapeAttr(profile.id)}" ${share?.canEdit?'checked':''} ${share?'':'disabled'}> Allow editing</label><button class="btn secondary" data-group-view-own="${escapeAttr(profile.id)}">Open</button></article>`}).join(''):'';
  const available=activeGroup?groupAvailableProfiles(activeGroup):[],sharedRows=available.map(profile=>{const key=groupProfileKey(activeGroup.id,profile.ownerId,profile.profileId),selected=selection===null||selection.has(key);return`<article class="group-profile-card ${profile.isOwn?'own':''}"><div><small>${escapeAttr(profile.ownerName)}${profile.isOwn?' · your account':''}</small><strong>${escapeAttr(profile.profileName)}</strong><span>${profile.isOwn?'Private profile available to you':profile.canEdit?'Owner allows editing':'Read only'}</span></div><label><input type="checkbox" data-group-outlook-owner="${profile.ownerId}" data-group-outlook-id="${escapeAttr(profile.profileId)}" ${selected?'checked':''}> Include in Outlook</label><button class="btn secondary" data-group-view-profile data-owner-id="${profile.ownerId}" data-profile-id="${escapeAttr(profile.profileId)}">View${profile.isOwn||profile.canEdit?' / Edit':''}</button></article>`}).join('');
  const approvedMembers=activeGroup?(activeGroup.members||[]).filter(member=>member.approvalStatus!=='pending'):[],pendingMembers=activeGroup?(activeGroup.members||[]).filter(member=>member.approvalStatus==='pending'):[];
  const memberRows=approvedMembers.map(member=>`<li><span><strong>${escapeAttr(member.displayName)}</strong><small>${member.role==='owner'?'Group owner':'Member'}</small></span>${activeGroup.ownerId===ownId&&member.userId!==ownId?`<button class="btn danger" data-group-remove-member="${member.userId}">Remove</button>`:''}</li>`).join('');
  const pendingRows=activeGroup?.ownerId===ownId?pendingMembers.map(member=>`<li class="pending"><span><strong>${escapeAttr(member.displayName)}</strong><small>Waiting for approval</small></span><span class="group-request-actions"><button class="btn" data-group-approve-member="${member.userId}">Approve</button><button class="btn danger" data-group-reject-member="${member.userId}">Reject</button></span></li>`).join(''):'';
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Groups</div><section class="groups-hero"><div><p class="eyebrow">Connected accounts</p><h1>Groups</h1><p class="lead">Share one profile or several, choose who can edit, and see selected Rebirth Outlooks together.</p></div><button class="btn secondary" id="refreshGroups">Refresh</button></section>${state.groups.error?`<div class="notice todo-error">${escapeAttr(state.groups.error)}</div>`:''}<section class="group-connect-panel"><form id="createGroupForm"><h2>Create a group</h2><input id="createGroupName" class="form-control" maxlength="60" placeholder="Group name" required><input id="createGroupDisplayName" class="form-control" maxlength="40" value="${escapeAttr(defaultGroupDisplayName())}" placeholder="Your display name" required><button class="btn" type="submit">Create</button></form><form id="joinGroupForm"><h2>Request to join a group</h2><input id="joinGroupCode" class="form-control" maxlength="20" placeholder="Invite code" required><input id="joinGroupDisplayName" class="form-control" maxlength="40" value="${escapeAttr(defaultGroupDisplayName())}" placeholder="Your display name" required><button class="btn" type="submit">Request</button></form></section>${activeGroup?`<div class="group-tabs">${state.groups.workspace.map(group=>`<button data-group-tab="${group.id}" class="${group.id===activeGroup.id?'active':''}">${escapeAttr(group.name)}</button>`).join('')}</div><section class="group-dashboard"><header><div><p class="eyebrow">${activeGroup.ownerId===ownId?'Your group':'Member group'}</p><h2>${escapeAttr(activeGroup.name)}</h2><p>${approvedMembers.length} connected account${approvedMembers.length===1?'':'s'}${pendingMembers.length&&activeGroup.ownerId===ownId?` · ${pendingMembers.length} pending`:''}</p></div><button class="group-invite" id="copyGroupInvite" type="button" data-invite="${escapeAttr(activeGroup.inviteCode)}" aria-label="Reveal and copy invite code"><small>Invite code · click to copy</small><strong><span class="invite-mask">••••••••••••</span><span class="invite-value">${escapeAttr(activeGroup.inviteCode)}</span></strong></button></header><div class="group-dashboard-grid"><section>${pendingRows?`<div class="group-requests"><h3>Join requests</h3><ul class="group-member-list">${pendingRows}</ul></div>`:''}<h3>Members</h3><ul class="group-member-list">${memberRows}</ul>${activeGroup.ownerId===ownId?'<button class="btn danger" id="deleteGroup">Delete group</button>':'<button class="btn danger" id="leaveGroup">Leave group</button>'}</section><section><h3>Profiles I share</h3><p>Sharing controls visibility. Editing is always off until you enable it for that profile.</p><div class="group-share-list">${profileRows||'<div class="empty">No cloud profiles found.</div>'}</div></section></div></section><section class="group-profiles-section"><header><div><p class="eyebrow">Profile access</p><h2>Profiles in this group</h2><p>Select any combination for the shared Rebirth Outlook.</p></div></header><div class="group-profile-grid">${sharedRows||'<div class="empty">No profiles are shared with this group yet.</div>'}</div></section><section class="group-outlook-panel group-page-outlook"><header><div><p class="eyebrow">Multi-profile tracking</p><h2>Combined Rebirth Outlook</h2><p>Every checked profile appears here without switching accounts.</p></div></header>${groupOutlookCardsHtml()}</section>`:'<div class="empty group-empty">Create a group or request access with an invite code. The group owner must approve you before the group appears.</div>'}`;
  const run=async(button,action,success)=>{try{if(button){button.disabled=true;button.textContent='Working…'}await action();toast(success);groupsPage()}catch(error){toast(error.message);if(button)button.disabled=false}};
  document.querySelector('#refreshGroups').onclick=event=>run(event.currentTarget,()=>loadGroupWorkspace(), 'Groups refreshed');
  document.querySelector('#createGroupForm').onsubmit=event=>{event.preventDefault();run(event.submitter,()=>createArchiveGroup(document.querySelector('#createGroupName').value.trim(),document.querySelector('#createGroupDisplayName').value.trim()),'Group created')};
  document.querySelector('#joinGroupForm').onsubmit=event=>{event.preventDefault();run(event.submitter,()=>joinArchiveGroup(document.querySelector('#joinGroupCode').value.trim(),document.querySelector('#joinGroupDisplayName').value.trim()),'Join request sent for owner approval')};
  document.querySelectorAll('[data-group-tab]').forEach(button=>button.onclick=()=>{localStorage.setItem('droid-archive-active-group',button.dataset.groupTab);groupsPage()});
  const inviteButton=document.querySelector('#copyGroupInvite');let inviteHideTimer;
  inviteButton?.addEventListener('click',async()=>{const touchMode=!matchMedia('(hover: hover) and (pointer: fine)').matches;if(touchMode){const reveal=!inviteButton.classList.contains('revealed');inviteButton.classList.toggle('revealed',reveal);clearTimeout(inviteHideTimer);if(reveal)inviteHideTimer=setTimeout(()=>inviteButton.classList.remove('revealed'),5000)}try{await navigator.clipboard.writeText(activeGroup.inviteCode);toast('Invite code copied')}catch{toast(`Invite code: ${activeGroup.inviteCode}`)}});
  document.querySelectorAll('[data-group-share]').forEach(input=>input.onchange=()=>{const edit=document.querySelector(`[data-group-edit="${CSS.escape(input.dataset.groupShare)}"]`);run(input,()=>setArchiveProfileShare(activeGroup.id,input.dataset.groupShare,input.checked,input.checked&&edit?.checked),input.checked?'Profile shared':'Profile made private')});
  document.querySelectorAll('[data-group-edit]').forEach(input=>input.onchange=()=>run(input,()=>setArchiveProfileShare(activeGroup.id,input.dataset.groupEdit,true,input.checked),input.checked?'Editing allowed':'Editing disabled'));
  document.querySelectorAll('[data-group-outlook-profile]').forEach(input=>input.onchange=()=>{setGroupOutlookProfile(activeGroup.id,ownId,input.dataset.groupOutlookProfile,input.checked);groupsPage()});
  document.querySelectorAll('[data-group-outlook-owner]').forEach(input=>input.onchange=()=>{setGroupOutlookProfile(activeGroup.id,input.dataset.groupOutlookOwner,input.dataset.groupOutlookId,input.checked);groupsPage()});
  document.querySelectorAll('[data-group-view-own]').forEach(button=>button.onclick=()=>{switchCloudProfile(button.dataset.groupViewOwn);location.hash='#/base'});
  document.querySelectorAll('[data-group-view-profile]').forEach(button=>button.onclick=()=>openGroupProfile(activeGroup.id,button.dataset.ownerId,button.dataset.profileId).catch(error=>toast(error.message)));
  document.querySelectorAll('[data-group-approve-member]').forEach(button=>button.onclick=()=>run(button,()=>reviewArchiveGroupMember(activeGroup.id,button.dataset.groupApproveMember,true),'Member approved'));
  document.querySelectorAll('[data-group-reject-member]').forEach(button=>button.onclick=()=>{if(confirm('Reject this join request?'))run(button,()=>reviewArchiveGroupMember(activeGroup.id,button.dataset.groupRejectMember,false),'Join request rejected')});
  document.querySelectorAll('[data-group-remove-member]').forEach(button=>button.onclick=()=>{if(confirm('Remove this member and all profiles they shared with the group?'))run(button,()=>removeArchiveGroupMember(activeGroup.id,button.dataset.groupRemoveMember),'Member removed')});
  document.querySelector('#leaveGroup')?.addEventListener('click',event=>{if(confirm(`Leave ${activeGroup.name}?`))run(event.currentTarget,()=>leaveArchiveGroup(activeGroup.id),'Group left')});
  document.querySelector('#deleteGroup')?.addEventListener('click',event=>{if(confirm(`Delete ${activeGroup.name}? This disconnects every member but does not delete anyone’s profiles.`))run(event.currentTarget,()=>deleteArchiveGroup(activeGroup.id),'Group deleted')})
}
function notFound(){app.innerHTML='<h1>Page not found</h1><p class="lead">That archive entry does not exist.</p><a class="btn" href="#/droids">Browse droids</a>'}
function toast(msg){const t=document.querySelector('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function normalizeIconicSurfaces(){if(location.hash.startsWith('#/droid/')){const d=state.droids.find(x=>slug(x.name)===location.hash.split('/')[2]);if(isIconic(d)){document.querySelector('.variant-tabs')?.remove();const statsHeading=[...document.querySelectorAll('article h2')].find(x=>x.textContent.includes('statistics'));if(statsHeading&&statsHeading.textContent!=='Statistics')statsHeading.textContent='Statistics';[...document.querySelectorAll('.info-row')].find(x=>x.querySelector('b')?.textContent==='Quality')?.remove();const add=document.querySelector('#addThis'),label=`Add ${d.name} to my base`;if(add&&add.textContent!==label)add.textContent=label}}if(location.hash.startsWith('#/droidex')){const active=document.querySelector('[data-dex-variant].active')?.dataset.dexVariant||'DEFAULT';document.querySelectorAll('[data-dex-own]').forEach(button=>{const d=state.droids.find(x=>x.name===button.dataset.dexOwn);if(isIconic(d)){if(active!=='DEFAULT')button.closest('.dex-card')?.remove();else button.closest('.dex-card')?.querySelector('.dex-flawless')?.remove()}});const validEntries=state.droidex.filter(x=>{const d=state.droids.find(y=>y.name===x.name);return d&&(x.variant==='DEFAULT'||!isIconic(d))});const total=document.querySelector('.dex-totals strong'),totalText=`${validEntries.length}/${droidexCapacity()}`;if(total&&total.textContent!==totalText)total.textContent=totalText;const available=state.droids.filter(d=>active==='DEFAULT'||!isIconic(d)),collected=validEntries.filter(x=>x.variant===active).length,summary=document.querySelector('.dex-toolbar>span'),summaryText=`${collected}/${available.length} ${active.toLowerCase()} collected`;if(summary&&summary.textContent!==summaryText)summary.textContent=summaryText}}
function decorateIconicDetail(){if(location.hash.split('?')[0]==='#/droid/cb-23'&&!app.querySelector('.cb23-rewards')){const rewards=document.createElement('section');rewards.className='cb23-rewards';rewards.innerHTML=cb23RewardsHtml();app.querySelector('.article-grid article')?.append(rewards);}if(!location.hash.startsWith('#/droid/'))return;const d=state.droids.find(x=>slug(x.name)===location.hash.split('/')[2]);if(!isIconic(d))return;const income=`${iconicIncome(d)*100}%/s`,rows=document.querySelector('.info-rows'),incomeRow=rows?[...rows.querySelectorAll('.info-row')].find(x=>x.querySelector('b')?.textContent==='Income'):null;if(incomeRow&&incomeRow.querySelector('span').textContent!==income)incomeRow.querySelector('span').textContent=income;if(rows&&!rows.querySelector('.iconic-perk-row'))rows.insertAdjacentHTML('beforeend',`<div class="info-row iconic-perk-row"><b>Perk</b><span>${ICONIC_EFFECTS[d.name]||'Event bonus'}</span></div>`);const lead=document.querySelector('article .lead');if(lead&&lead.dataset.iconicIncome!==income){lead.dataset.iconicIncome=income;lead.innerHTML=`<strong>${d.name}</strong> is an iconic ${d.type.toLowerCase()} droid with <strong>${income}</strong> income.`}const table=document.querySelector('article table');if(table&&table.dataset.iconicIncome!==income){table.dataset.iconicIncome=income;table.innerHTML=`<thead><tr><th>Income</th></tr></thead><tbody><tr class="selected-variant"><td><strong>${income}</strong></td></tr></tbody>`}const gameplay=[...document.querySelectorAll('article h2')].find(x=>x.textContent==='Gameplay')?.nextElementSibling;if(gameplay&&!gameplay.classList.contains('iconic-gameplay')){gameplay.classList.add('iconic-gameplay');gameplay.innerHTML=`While placed in a productive Worker, Astromech, or Battle station, <strong>${d.name}</strong> provides <strong>${income}</strong> income from eligible droid production. Its unique perk is <strong>${ICONIC_EFFECTS[d.name]||'an event bonus'}</strong>. Build, Lounge, and Companion placements do not activate this income.`}}
function openComparisonFor(name){showDroidComparisonModal();const one=document.querySelector('#comparisonOne'),two=document.querySelector('#comparisonTwo');if(!one)return;one.value=name;if(two?.value===name){const alternative=state.droids.find(d=>d.name!==name);if(alternative)two.value=alternative.name}one.dispatchEvent(new Event('change'))}
function enhanceCompareButtons(){
  if(location.hash.startsWith('#/droid/')){const d=state.droids.find(x=>slug(x.name)===location.hash.split('/')[2]),add=document.querySelector('#addThis');if(d&&add&&!document.querySelector('[data-detail-compare]'))add.parentElement.insertAdjacentHTML('beforeend',`<button class="btn secondary" type="button" data-detail-compare data-compare-droid="${d.name}">Compare</button>`)}
  if(location.hash.startsWith('#/droidex'))document.querySelectorAll('.dex-card').forEach(card=>{const own=card.querySelector('[data-dex-own]'),actions=own?.parentElement,name=own?.dataset.dexOwn;if(actions&&name&&!actions.querySelector('[data-compare-droid]'))actions.insertAdjacentHTML('beforeend',`<button class="dex-compare" type="button" data-compare-droid="${name}">Compare</button>`)})
}
function normalizePageLabels(){document.querySelectorAll('.breadcrumbs a').forEach(a=>{if(a.textContent==='Main page')a.textContent='Homepage'});if(location.hash.startsWith('#/droids')){const title=app.querySelector('h1');if(title?.textContent==='All droids')title.textContent='Droids'}if(location.hash.startsWith('#/base')){const title=app.querySelector('h1');if(title?.textContent==='My base')title.textContent='Base';const eyebrow=app.querySelector('.eyebrow');if(eyebrow?.textContent==='Personal planner')eyebrow.textContent='Personal base'}normalizeIconicSurfaces();decorateIconicDetail();addDetailDroidexControls();enhanceCompareButtons()}
new MutationObserver(()=>{normalizePageLabels();mountArchiveTimers();decorateSharedView()}).observe(app,{childList:true,subtree:true});
app.addEventListener('click',event=>{const button=event.target.closest('[data-compare-droid]');if(!button)return;event.preventDefault();event.stopPropagation();openComparisonFor(button.dataset.compareDroid)});
app.addEventListener('click',event=>{const button=event.target.closest('[data-group-view]');if(!button)return;event.preventDefault();const [groupId,ownerId,...profileParts]=button.dataset.groupView.split('|');openGroupProfile(groupId,ownerId,profileParts.join('|')).catch(error=>toast(error.message))});
const GALACTIC_ADMIN_EMAIL='xraffo@gmail.com';
const GALACTIC_LOCAL_KEY='droid-archive-galactic-reports';
const galacticUserEmail=()=>String(state.cloud.user?.email||'').toLowerCase();
const galacticIsAdmin=()=>galacticUserEmail()===GALACTIC_ADMIN_EMAIL;
const galacticReportTable=()=>supabaseConfig.galacticReportsTable||'galactic_reports';
const galacticModsTable=()=>supabaseConfig.galacticModsTable||'galactic_report_mods';
function parseGalacticNumber(value){const text=String(value||'').trim().replace(/,/g,'');const match=text.match(/^(\d+(?:\.\d+)?)\s*([kmbt])?$/i);if(!match)throw Error('Enter a number like 12400 or 12.4k.');const multipliers={k:1e3,m:1e6,b:1e9,t:1e12},number=Number(match[1])*(multipliers[match[2]?.toLowerCase()]||1);if(!Number.isFinite(number)||number<0)throw Error('Enter a positive number.');return Math.round(number)}
function galacticLocalReports(){try{return JSON.parse(localStorage.getItem(GALACTIC_LOCAL_KEY)||'[]')}catch{return[]}}
function saveGalacticLocalReports(rows){localStorage.setItem(GALACTIC_LOCAL_KEY,JSON.stringify(rows))}
async function galacticRole(){if(!cloudConnected())return{admin:false,mod:false,shared:false};if(galacticIsAdmin())return{admin:true,mod:true,shared:true};try{const {data,error}=await supabaseClient.from(galacticModsTable()).select('email').eq('email',galacticUserEmail()).maybeSingle();if(error)throw error;return{admin:false,mod:Boolean(data),shared:true}}catch{return{admin:false,mod:false,shared:true,setupError:'Galactic report moderation table is not ready yet.'}}}
async function loadGalacticReports(role){if(!cloudConnected())return galacticLocalReports();let q=supabaseClient.from(galacticReportTable()).select('*').order('created_at',{ascending:false});if(!(role.admin||role.mod))q=q.eq('user_id',state.cloud.user.id);const {data,error}=await q;if(error)throw Error(error.message);return data||[]}
async function submitGalacticReportLegacy(payload){if(cloudConnected()){const {error}=await supabaseClient.from(galacticReportTable()).insert(payload);if(error)throw Error(error.message);return}const rows=galacticLocalReports();rows.unshift({...payload,id:cloudId(),email:'Local only',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});saveGalacticLocalReports(rows)}
async function updateGalacticReport(id,valueRaw){const value=parseGalacticNumber(valueRaw);const {error}=await supabaseClient.from(galacticReportTable()).update({value_raw:valueRaw,value,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw Error(error.message)}
async function deleteGalacticReport(id){const {error}=await supabaseClient.from(galacticReportTable()).delete().eq('id',id);if(error)throw Error(error.message)}
async function addGalacticMod(email){const clean=String(email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))throw Error('Enter a valid email address.');const {error}=await supabaseClient.from(galacticModsTable()).upsert({email:clean});if(error)throw Error(error.message)}
async function galacticReportsPageLegacy(){let role={admin:false,mod:false,shared:false},rows=[],notice='';const kindLabel=x=>x==='buy_cost'?'Buy Cost':'Earn Amount',types=[...new Set(state.droids.filter(d=>!isIconic(d)).map(d=>d.type))],droidsFor=type=>state.droids.filter(d=>!isIconic(d)&&(!type||d.type===type)).sort((a,b)=>a.name.localeCompare(b.name));const renderRows=()=>rows.map(row=>`<tr><td><strong>${row.droid_name}</strong><small>${row.droid_type}</small></td><td>${kindLabel(row.report_kind)}</td><td><strong>${fmt(Number(row.value)||0)}</strong><small>${row.value_raw||''}</small></td>${role.admin||role.mod?`<td>${row.email||''}</td>`:''}<td>${row.created_at?new Date(row.created_at).toLocaleString():''}</td>${role.admin?`<td><button class="btn secondary" data-galactic-edit="${row.id}">Edit</button><button class="btn danger" data-galactic-delete="${row.id}">Delete</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${role.admin?6:role.mod?5:4}" class="empty">No Galactic reports yet.</td></tr>`;const draw=()=>{const type=document.querySelector('#galacticType'),droid=document.querySelector('#galacticDroid'),badge=document.querySelector('#galacticRoleBadge'),note=document.querySelector('#galacticReportNotice'),admin=document.querySelector('#galacticAdminTools'),head=document.querySelector('#galacticReportHead'),body=document.querySelector('#galacticRows');if(!type)return;const selectedType=type.value||types[0]||'';type.innerHTML=types.map(x=>`<option value="${x}" ${x===selectedType?'selected':''}>${x}</option>`).join('');droid.innerHTML=droidsFor(selectedType).map(x=>`<option value="${x.name}">${x.name}</option>`).join('');badge.textContent=role.admin?'Admin view':role.mod?'Mod view':cloudConnected()?'My submissions':'Local only';badge.classList.toggle('local',!cloudConnected());note.innerHTML=notice||(!cloudConnected()?`Sign in to submit shared reports. Local-only entries are stored on this device.`:role.admin||role.mod?`You can view all Galactic reports.${role.admin?' Admin controls are enabled.':' Moderator view is read-only.'}`:`Only your own submissions are shown here.`);admin.hidden=!role.admin;head.innerHTML=`<tr><th>Droid</th><th>Report</th><th>Value</th>${role.admin||role.mod?'<th>Submitted by</th>':''}<th>Submitted</th>${role.admin?'<th>Actions</th>':''}</tr>`;body.innerHTML=renderRows();body.querySelectorAll('[data-galactic-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this Galactic report?'))return;try{await deleteGalacticReport(b.dataset.galacticDelete);toast('Report deleted');await refresh()}catch(e){toast(e.message)}});body.querySelectorAll('[data-galactic-edit]').forEach(b=>b.onclick=async()=>{const current=rows.find(x=>x.id===b.dataset.galacticEdit),next=prompt('Update value',current?.value_raw||current?.value||'');if(next===null)return;try{await updateGalacticReport(b.dataset.galacticEdit,next);toast('Report updated');await refresh()}catch(e){toast(e.message)}})};const refresh=async()=>{try{role=await galacticRole();rows=await loadGalacticReports(role);notice=role.setupError||''}catch(e){rows=cloudConnected()?[]:galacticLocalReports();notice=e.message}draw()};app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Galactic Reports</div><section class="galactic-report-hero"><div><p class="eyebrow">Community data</p><h1>Galactic Reports</h1><p class="lead">Report Galactic droid buy costs and earn amounts while the values are still being confirmed.</p></div><span id="galacticRoleBadge" class="report-badge">Loading</span></section><div id="galacticReportNotice" class="notice"></div><form id="galacticReportForm" class="galactic-report-form"><label>Type<select id="galacticType"></select></label><label>Droid<select id="galacticDroid"></select></label><label>Report<select id="galacticKind"><option value="buy_cost">Buy Cost</option><option value="earn_amount">Earn Amount</option></select></label><label>Value<input id="galacticValue" placeholder="12.4k or 12400" required></label><button class="btn" type="submit">Submit report</button></form><section id="galacticAdminTools" class="galactic-mods" hidden><h2>Moderators</h2><form id="galacticModForm"><input id="galacticModEmail" type="email" placeholder="mod@example.com" required><button class="btn secondary" type="submit">Add mod</button></form></section><section class="galactic-report-list"><h2>Reports</h2><table><thead id="galacticReportHead"></thead><tbody id="galacticRows"></tbody></table></section>`;document.querySelector('#galacticType').onchange=draw;document.querySelector('#galacticReportForm').onsubmit=async e=>{e.preventDefault();try{const valueRaw=document.querySelector('#galacticValue').value,value=parseGalacticNumber(valueRaw),droidName=document.querySelector('#galacticDroid').value,droid=state.droids.find(x=>x.name===droidName);if(cloudNeedsLogin())return showAuthModal('signin');await submitGalacticReport({user_id:state.cloud.user?.id||null,email:galacticUserEmail(),droid_name:droidName,droid_type:droid?.type||document.querySelector('#galacticType').value,report_kind:document.querySelector('#galacticKind').value,value_raw:valueRaw,value,updated_at:new Date().toISOString()});document.querySelector('#galacticValue').value='';toast('Report submitted');await refresh()}catch(error){toast(error.message)}};document.querySelector('#galacticModForm').onsubmit=async e=>{e.preventDefault();try{await addGalacticMod(document.querySelector('#galacticModEmail').value);document.querySelector('#galacticModEmail').value='';toast('Mod added');await refresh()}catch(error){toast(error.message)}};draw();await refresh()}
function validateGalacticScreenshotUrl(value){const text=String(value||'').trim();if(!text)return'';let url;try{url=new URL(text)}catch{throw Error('Screenshot must be a Gyazo or Discord image link.')}const host=url.hostname.toLowerCase();if(host.includes('imgur.com'))throw Error('Imgur links will not work as Imgur is blocked in the UK. Please use a Gyazo or Discord image link.');const gyazo=host==='gyazo.com'||host.endsWith('.gyazo.com'),discord=host==='cdn.discordapp.com'||host==='media.discordapp.net'||host.endsWith('.discordapp.net')||host.endsWith('.discordapp.com');if(!gyazo&&!discord)throw Error('Screenshot must be a Gyazo or Discord image link.');return text}
async function submitGalacticReport(payload){const items=Array.isArray(payload)?payload:[payload];if(cloudConnected()){const {error}=await supabaseClient.from(galacticReportTable()).insert(items);if(error)throw Error(error.message);return}const rows=galacticLocalReports(),now=new Date().toISOString();rows.unshift(...items.map(item=>({...item,id:cloudId(),email:'Local only',created_at:now,updated_at:now})));saveGalacticLocalReports(rows)}
function showGalacticReportModal(onDone){const root=document.querySelector('#modalRoot'),allowed=state.droids.filter(d=>!isIconic(d)).sort((a,b)=>a.name.localeCompare(b.name));let items=[],picking=false,screenshotUrl='';const rowHtml=(item,i)=>`<article class="galactic-report-row"><button class="btn danger" data-report-remove="${i}" type="button">Remove</button><div><strong>${item.name}</strong><small>${item.type}</small></div><label>Report<select data-report-kind="${i}"><option value="buy_cost" ${item.report_kind==='buy_cost'?'selected':''}>Buy Cost</option><option value="earn_amount" ${item.report_kind==='earn_amount'?'selected':''}>Earn Amount</option></select></label><label>Value<input data-report-value="${i}" placeholder="12.4k or 12400"></label></article>`;const draw=()=>{root.innerHTML=`<div class="modal-backdrop"><section class="modal galactic-report-modal" role="dialog" aria-modal="true"><p class="eyebrow">Galactic Reports</p><h2>Submit Galactic values</h2><p class="picker-hint">Add one or more droids, enter the known values, and attach an optional Gyazo or Discord image link.</p><div class="galactic-report-selected">${items.map(rowHtml).join('')||'<div class="empty">No droids selected yet.</div>'}</div><label class="field">Screenshot link<input id="galacticScreenshotUrl" class="form-control" placeholder="Gyazo or Discord image link"></label><p id="galacticReportError" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn secondary" id="addGalacticReportDroid" type="button">Add droid</button><button class="btn" id="sendGalacticReport" type="button" ${items.length?'':'disabled'}>Submit report</button><button class="btn ghost" id="cancelGalacticReport" type="button">Cancel</button></div><div id="galacticReportPicker"></div></section></div>`;items.forEach((item,i)=>{root.querySelector(`[data-report-kind="${i}"]`).onchange=e=>item.report_kind=e.target.value;const valueInput=root.querySelector(`[data-report-value="${i}"]`);valueInput.value=item.value_raw||'';valueInput.oninput=e=>item.value_raw=e.target.value;root.querySelector(`[data-report-remove="${i}"]`).onclick=()=>{items.splice(i,1);draw()}});const proof=root.querySelector('#galacticScreenshotUrl');proof.value=screenshotUrl;proof.oninput=e=>screenshotUrl=e.target.value;root.querySelector('#cancelGalacticReport').onclick=()=>root.innerHTML='';root.querySelector('#addGalacticReportDroid').onclick=()=>{picking=true;drawPicker()};root.querySelector('#sendGalacticReport').onclick=async()=>{const error=root.querySelector('#galacticReportError');try{if(!items.length)throw Error('Add at least one droid.');const screenshot_url=validateGalacticScreenshotUrl(root.querySelector('#galacticScreenshotUrl').value),report_group_id=cloudId(),payload=items.map(item=>{const value=parseGalacticNumber(item.value_raw),droid=state.droids.find(x=>x.name===item.name);return{user_id:state.cloud.user?.id||null,email:galacticUserEmail(),droid_name:item.name,droid_type:droid?.type||item.type,report_kind:item.report_kind,value_raw:item.value_raw,value,screenshot_url,report_group_id,updated_at:new Date().toISOString()}});if(cloudNeedsLogin())return showAuthModal('signin');await submitGalacticReport(payload);root.innerHTML='';toast(`${payload.length} report${payload.length===1?'':'s'} submitted`);onDone?.()}catch(e){error.textContent=e.message}};if(picking)drawPicker()};const drawPicker=()=>{const picker=root.querySelector('#galacticReportPicker');picker.innerHTML=`<div class="galactic-picker"><input id="galacticPickerSearch" class="form-control picker-search" placeholder="Search droids..." autofocus><div id="galacticPickerResults" class="picker-results"></div></div>`;const render=()=>{const q=root.querySelector('#galacticPickerSearch').value.toLowerCase();root.querySelector('#galacticPickerResults').innerHTML=allowed.filter(d=>d.name.toLowerCase().includes(q)||d.type.toLowerCase().includes(q)).map(d=>`<button class="picker-droid" data-galactic-pick="${d.name}"><span>${picture(d,'GALACTIC')}</span><b>${d.name}</b><small>${rarityText(d.rarity)} · ${d.type}</small></button>`).join('')||'<p class="roster-empty">No matching droids.</p>';root.querySelectorAll('[data-galactic-pick]').forEach(b=>b.onclick=()=>{const d=state.droids.find(x=>x.name===b.dataset.galacticPick);items.push({name:d.name,type:d.type,report_kind:'buy_cost',value_raw:''});picking=false;draw()})};root.querySelector('#galacticPickerSearch').oninput=render;render()};draw()}
async function galacticReportsPage(){let role={admin:false,mod:false,shared:false},rows=[],notice='';const kindLabel=x=>x==='buy_cost'?'Buy Cost':'Earn Amount';const renderRows=()=>rows.map(row=>`<tr><td><strong>${row.droid_name}</strong><small>${row.droid_type}${row.report_group_id?` · Batch ${String(row.report_group_id).slice(0,8)}`:''}</small></td><td>${kindLabel(row.report_kind)}</td><td><strong>${fmt(Number(row.value)||0)}</strong><small>${row.value_raw||''}</small></td><td>${row.screenshot_url?`<a href="${row.screenshot_url}" target="_blank" rel="noopener">Screenshot</a>`:'-'}</td>${role.admin||role.mod?`<td>${row.email||''}</td>`:''}<td>${row.created_at?new Date(row.created_at).toLocaleString():''}</td>${role.admin?`<td><button class="btn secondary" data-galactic-edit="${row.id}">Edit</button><button class="btn danger" data-galactic-delete="${row.id}">Delete</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${role.admin?7:role.mod?6:5}" class="empty">No Galactic reports yet.</td></tr>`;const draw=()=>{const badge=document.querySelector('#galacticRoleBadge'),note=document.querySelector('#galacticReportNotice'),admin=document.querySelector('#galacticAdminTools'),head=document.querySelector('#galacticReportHead'),body=document.querySelector('#galacticRows');if(!badge)return;badge.textContent=role.admin?'Admin view':role.mod?'Mod view':cloudConnected()?'My submissions':'Local only';badge.classList.toggle('local',!cloudConnected());note.innerHTML=notice||(!cloudConnected()?`Sign in to submit shared reports. Local-only entries are stored on this device.`:role.admin||role.mod?`You can view all Galactic reports.${role.admin?' Admin controls are enabled.':' Moderator view is read-only.'}`:`Only your own submissions are shown here.`);admin.hidden=!role.admin;head.innerHTML=`<tr><th>Droid</th><th>Report</th><th>Value</th><th>Proof</th>${role.admin||role.mod?'<th>Submitted by</th>':''}<th>Submitted</th>${role.admin?'<th>Actions</th>':''}</tr>`;body.innerHTML=renderRows();body.querySelectorAll('[data-galactic-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this Galactic report?'))return;try{await deleteGalacticReport(b.dataset.galacticDelete);toast('Report deleted');await refresh()}catch(e){toast(e.message)}});body.querySelectorAll('[data-galactic-edit]').forEach(b=>b.onclick=async()=>{const current=rows.find(x=>x.id===b.dataset.galacticEdit),next=prompt('Update value',current?.value_raw||current?.value||'');if(next===null)return;try{await updateGalacticReport(b.dataset.galacticEdit,next);toast('Report updated');await refresh()}catch(e){toast(e.message)}})};const refresh=async()=>{try{role=await galacticRole();rows=await loadGalacticReports(role);notice=role.setupError||''}catch(e){rows=cloudConnected()?[]:galacticLocalReports();notice=e.message}draw()};app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Galactic Reports</div><section class="galactic-report-hero"><div><p class="eyebrow">Community data</p><h1>Galactic Reports</h1><p class="lead">Report Galactic droid buy costs and earn amounts while the values are still being confirmed.</p></div><span id="galacticRoleBadge" class="report-badge">Loading</span></section><div id="galacticReportNotice" class="notice"></div><div class="galactic-report-actions"><button class="btn" id="openGalacticReportModal">New report</button></div><section id="galacticAdminTools" class="galactic-mods" hidden><h2>Moderators</h2><form id="galacticModForm"><input id="galacticModEmail" type="email" placeholder="mod@example.com" required><button class="btn secondary" type="submit">Add mod</button></form></section><section class="galactic-report-list"><h2>Reports</h2><table><thead id="galacticReportHead"></thead><tbody id="galacticRows"></tbody></table></section>`;document.querySelector('#openGalacticReportModal').onclick=()=>showGalacticReportModal(refresh);document.querySelector('#galacticModForm').onsubmit=async e=>{e.preventDefault();try{await addGalacticMod(document.querySelector('#galacticModEmail').value);document.querySelector('#galacticModEmail').value='';toast('Mod added');await refresh()}catch(error){toast(error.message)}};draw();await refresh()}
async function todoPage(){app.querySelector('.archive-timers')?.remove();let filter='open',tasks=[];app.innerHTML='<div class="loading">Loading development list...</div>';try{const response=await fetch(`data/dev-todos.json?${Date.now()}`);if(!response.ok)throw Error('Unable to load the development list.');tasks=await response.json();if(!Array.isArray(tasks))throw Error('The development list is not valid.');tasks=[...tasks,...patchTodoTasks()]}catch(error){app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / To Do List</div><h1>To Do List</h1><div class="notice todo-error">${error.message}</div>`;return}const render=()=>{const list=tasks.filter(x=>filter==='all'||filter==='done'?filter==='all'||x.done:!x.done);app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / To Do List</div><section class="todo-head dev-todo-head"><div><p class="eyebrow">Development roadmap</p><h1>To Do List</h1><p class="lead">Planned work and completed updates for Droid Archives. This list is maintained by RSSaltea and is visible to everyone.</p></div><a class="btn secondary todo-edit" href="https://github.com/RSSaltea/DroidArchives/edit/main/data/dev-todos.json" target="_blank" rel="noopener">Edit list on GitHub</a></section><div class="todo-help"><strong>Adding a task:</strong> open the editor, copy an existing object, give it a unique ID and description, then commit the change. Patch notes can also add To Do items by including a <code>todo</code> block in <code>data/patch-notes.json</code>.</div><div class="todo-toolbar"><div>${['open','done','all'].map(x=>`<button data-todo-filter="${x}" class="${filter===x?'active':''}">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div><span>${tasks.filter(x=>!x.done).length} remaining</span></div><div class="todo-list">${list.map(x=>`<article class="todo-item ${x.done?'done':''} ${x.patchNote?'patch-note-task':''}"><span class="todo-status ${x.done?'done':'open'}">${x.done?'Done':'Open'}</span><span>${x.text}${x.patchNote?'<small>Patch note</small>':''}</span></article>`).join('')||'<div class="empty">No tasks in this view.</div>'}</div>`;document.querySelectorAll('[data-todo-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.todoFilter;render()})};render()}
let novaShopPage,novaDetailPage;
(function () {
  const CATEGORY_ICONS = {
    featured: 'critical-chance',
    core: 'max-health',
    workshop: 'blueprint-vendor',
    cosmetic: 'nova-crystal-base-paint',
    'lobby-boosts': 'luck-boost-token',
  };

  const iconHtml = (item, className = '') => {
    const icon = item?.icon || '';
    return /^(?:assets\/|https?:\/\/)/.test(icon)
      ? `<img class="${className}" src="${icon}" alt="">`
      : `<span class="${className}">${icon || '?'}</span>`;
  };

  const categoryIcon = category => {
    if (category.id === 'planner') return '<span class="nova-planner-icon" aria-hidden="true">Σ</span>';
    if (category.id === 'iconic') {
      const droid = state.droids.find(item => item.name === 'R2-D2') || state.droids.find(item => item.rarity === 'ICONIC');
      return droid ? picture(droid, 'DEFAULT') : '<span>★</span>';
    }
    return iconHtml(novaUpgrade(CATEGORY_ICONS[category.id]));
  };

  const upgradeTotal = novaTotalCost;

  const iconicItems = () => state.droids
    .filter(droid => droid.rarity === 'ICONIC')
    .map(droid => ({
      id: `iconic-${slug(droid.name)}`,
      name: droid.name,
      category: 'iconic',
      droid,
      description: ICONIC_EFFECTS[droid.name] || 'Limited Iconic Droid.',
      iconic: true,
      novaCrystalCost: droid.novaCrystalCost,
    }));

  const plannerStorageKey = () => `droid-archive-nova-planner:${state.cloud?.activeProfileId || 'local'}`;
  const plannerMaxRebirthKey = () => `${plannerStorageKey()}:max-rebirth`;
  const plannerMaxRebirth = shop => Math.max(12,Math.min(Number(localStorage.getItem(plannerMaxRebirthKey()))||40,Math.max(...shop.rebirthRewards.map(reward=>reward.rebirth))));
  const plannerTargets = () => {
    try { return JSON.parse(localStorage.getItem(plannerStorageKey()) || '{}') || {}; }
    catch { return {}; }
  };
  const savePlannerTargets = targets => localStorage.setItem(plannerStorageKey(), JSON.stringify(targets));
  const plannerUpgrades = shop => shop.upgrades.filter(upgrade => !upgrade.repeatable && !upgrade.comingSoon && !upgrade.unavailable && upgrade.levels?.length);
  const plannerLevelCap = upgrade => upgrade.uncapped ? 10000 : upgrade.levels.length;
  const plannedLevel = (upgrade, targets) => Math.max(novaLevelFor(upgrade.id), Math.min(plannerLevelCap(upgrade), Number(targets[upgrade.id] ?? novaLevelFor(upgrade.id)) || 0));
  const plannedCost = (upgrade, target) => {let total=0;for(let level=novaLevelFor(upgrade.id);level<target;level++)total+=Number(upgrade.levels[level]?.cost ?? (Number(upgrade.costBase)||0)+(Number(upgrade.costScale)||0)*level)||0;return total};

  const renderPlanner = (shop, categories, changeCategory) => {
    const upgrades = plannerUpgrades(shop), targets = plannerTargets(), maxReach = plannerMaxRebirth(shop);
    const rows = upgrades.map(upgrade => ({upgrade, owned:novaLevelFor(upgrade.id), target:plannedLevel(upgrade, targets)}));
    const groups = categories.map(category=>({category,rows:rows.filter(row=>row.upgrade.category===category.id)})).filter(group=>group.rows.length);
    const total = rows.reduce((sum, row) => sum + plannedCost(row.upgrade, row.target), 0);
    const changed = rows.filter(row => row.target > row.owned).length;
    const options = novaRebirthRouteOptions(total,shop);
    const reachableOptions = options.filter(option=>option.rebirth<=maxReach);
    const ranked = [...reachableOptions].sort((a,b)=>a.runs-b.runs||b.totalNovaCrystals-a.totalNovaCrystals);
    const fastestRuns = ranked[0]?.runs || 0;
    const suggestions = ranked.slice(0,3);
    const stepper=(upgrade,value,field,min)=>`<div class="nova-plan-stepper"><button type="button" data-plan-step="${upgrade.id}" data-plan-field="${field}" data-plan-delta="-1" aria-label="Decrease ${upgrade.name} ${field}" ${value<=min?'disabled':''}>−</button><input type="number" min="${min}" ${upgrade.uncapped?'':`max="${upgrade.levels.length}"`} value="${value}" data-plan-${field}="${upgrade.id}" aria-label="${upgrade.name} ${field} level"><button type="button" data-plan-step="${upgrade.id}" data-plan-field="${field}" data-plan-delta="1" aria-label="Increase ${upgrade.name} ${field}" ${value>=plannerLevelCap(upgrade)?'disabled':''}>+</button></div>`;
    app.innerHTML = `<div class="breadcrumbs"><a href="#/">Homepage</a> / Nova Shop / Planner</div>
      <section class="nova-command nova-planner-command">
        <header class="nova-command-head"><div><p class="eyebrow">Nova upgrades</p><h1>Nova Shop Planner</h1><p>Choose what you own and where you want each perk to end up.</p></div><div class="nova-currency"><img src="${shop.currency.icon}" alt=""><span>${fmt(total)} needed</span></div></header>
        <div class="nova-planner-toolbar"><button class="btn secondary" data-nova-category="featured">← Back to Nova Shop</button><span>Targets and reachable rebirth are saved separately for this profile.</span><button class="btn ghost" id="resetNovaPlan" ${changed?'':'disabled'}>Reset targets</button></div>
        <div class="nova-reach-setting"><div><small>Route limit</small><strong>Highest rebirth you can reach</strong><span>Suggested routes stay within this level. Totals include regular Nova plus the final Super Rebirth payout.</span></div><label for="novaMaxReach">Plan up to<select id="novaMaxReach">${options.map(option=>`<option value="${option.rebirth}" ${option.rebirth===maxReach?'selected':''}>RB ${option.rebirth} · ${novaCount(option.totalNovaCrystals)} Nova</option>`).join('')}</select></label></div>
        <div class="nova-planner-summary"><div><small>Nova required</small><strong>${fmt(total)}</strong><span>to complete this plan</span></div><div><small>Perks changing</small><strong>${changed}</strong><span>of ${rows.length} tracked perks</span></div><div><small>Fewest runs</small><strong>${total ? `RB ${ranked[0].rebirth} × ${ranked[0].runs}` : 'All done'}</strong><span>${total?`${novaCount(ranked[0].totalNovaCrystals)} Nova per full run`:'No Nova still needed'}</span></div></div>
        <div class="nova-planner-groups">${groups.map(({category,rows:categoryRows})=>`<section class="nova-plan-group"><header>${categoryIcon(category)}<div><h2>${category.name}</h2><span>${categoryRows.length} perk${categoryRows.length===1?'':'s'}</span></div></header><div class="nova-plan-card-grid">${categoryRows.map(({upgrade,owned,target})=>{const cost=plannedCost(upgrade,target);return `<article class="nova-plan-card ${target>owned?'planned':''}"><header>${iconHtml(upgrade)}<div><h3>${upgrade.name}</h3><span>${upgrade.uncapped?'No level cap':`${upgrade.levels.length} level${upgrade.levels.length===1?'':'s'}`}</span></div><strong>${cost?`${fmt(cost)} Nova`:'No cost'}</strong></header><div class="nova-plan-controls"><label><span>Owned now</span>${stepper(upgrade,owned,'owned',minimumNovaLevel(upgrade.id))}</label><span class="nova-plan-arrow" aria-hidden="true">→</span><label><span>Target level</span>${stepper(upgrade,target,'target',owned)}</label></div></article>`}).join('')}</div></section>`).join('')}</div>
      </section>
      <section class="nova-srb-planner"><header><div><p class="eyebrow">Super Rebirth routes</p><h2>How many runs will the plan take?</h2><p>Showing every route from RB12 to your selected limit of RB${maxReach}. Each full run includes regular Nova earned along the way plus the final Super Rebirth payout. Counts are rounded up and compare the number of runs, not play time.</p></div><strong>${fmt(total)} Nova target</strong></header>${total?`<div class="nova-route-options">${suggestions.map((option,index)=>`<article class="${index===0?'best':''}"><small>${index===0?'Fewest runs':'Alternative'}</small><strong>${option.runs} SRB${option.runs===1?'':'s'}</strong><span>Reach RB ${option.rebirth} · ${novaCount(option.totalNovaCrystals)} Nova each</span></article>`).join('')}</div>`:'<div class="nova-plan-complete">Your owned levels already cover every target in this plan.</div>'}<h3>RB12–RB${maxReach} breakdown</h3><div class="nova-srb-levels">${reachableOptions.map(option=>`<article class="${total&&option.runs===fastestRuns?'fastest':''}"><strong>RB ${option.rebirth}</strong><span>${novaCount(option.totalNovaCrystals)} Nova/run</span><small>${novaCount(option.regularTotal)} regular + ${novaCount(option.superRebirthNova)} SRB</small><b>${option.runs} SRB${option.runs===1?'':'s'}</b></article>`).join('')}</div></section>`;
    const updatePlanLevel=(upgrade,field,value)=>{const level=Math.max(field==='owned'?minimumNovaLevel(upgrade.id):novaLevelFor(upgrade.id),Math.min(plannerLevelCap(upgrade),Number(value)||0));if(field==='owned'){setNovaLevel(upgrade.id,level,false);if(Number(targets[upgrade.id])<level)targets[upgrade.id]=level}else targets[upgrade.id]=level;savePlannerTargets(targets);renderPlanner(shop,categories,changeCategory)};
    document.querySelector('[data-nova-category]')?.addEventListener('click',button=>changeCategory(button.currentTarget.dataset.novaCategory));
    document.querySelector('#novaMaxReach')?.addEventListener('change',event=>{localStorage.setItem(plannerMaxRebirthKey(),event.target.value);renderPlanner(shop,categories,changeCategory)});
    document.querySelector('#resetNovaPlan')?.addEventListener('click',()=>{savePlannerTargets({});renderPlanner(shop,categories,changeCategory)});
    document.querySelectorAll('[data-plan-owned],[data-plan-target]').forEach(input=>input.onchange=()=>{const field=input.hasAttribute('data-plan-owned')?'owned':'target',id=input.dataset.planOwned||input.dataset.planTarget;updatePlanLevel(novaUpgrade(id),field,input.value)});
    document.querySelectorAll('[data-plan-step]').forEach(button=>button.onclick=()=>{const upgrade=novaUpgrade(button.dataset.planStep),field=button.dataset.planField,current=field==='owned'?novaLevelFor(upgrade.id):plannedLevel(upgrade,targets);updatePlanLevel(upgrade,field,current+Number(button.dataset.planDelta))});
  };

  novaShopPage = function novaShopPage(selectedFromRoute) {
    let category = localStorage.getItem('droid-archive-nova-category') || 'featured';
    let selectedId = selectedFromRoute || localStorage.getItem('droid-archive-nova-selected') || '';

    const render = () => {
      const shop = state.novaShop;
      if (!shop) {
        app.innerHTML = '<h1>Nova Shop unavailable</h1>';
        return;
      }
      const categories = shop.categories;
      const categoryItems = [...categories,{id:'planner',name:'Planner'}];
      if (!categoryItems.some(item => item.id === category)) category = categories[0]?.id || 'core';
      if(category === 'planner'){
        localStorage.setItem('droid-archive-nova-category', category);
        renderPlanner(shop,categoryItems,nextCategory=>{category=nextCategory;selectedId='';render()});
        return;
      }
      const list = category === 'iconic' ? iconicItems() : shop.upgrades.filter(item => item.category === category && !item.unavailable);
      let selected = list.find(item => item.id === selectedId) || list[0];
      selectedId = selected?.id || '';
      localStorage.setItem('droid-archive-nova-category', category);
      localStorage.setItem('droid-archive-nova-selected', selectedId);

      const selectedLevel = selected && !selected.iconic ? novaLevelFor(selected.id) : 0;
      const selectedCategory = categories.find(item => item.id === category);
      const maxLabel = selected?.uncapped ? '∞' : selected?.levels?.length || 0;
      const detailRows = selected && !selected.iconic
        ? selected.repeatable
          ? `<tr class="${selectedLevel?'owned':''}"><td>Each token</td><td>${novaCost(selected.levels[0])}</td><td>${selected.levels[0]?.reward||'—'}</td><td>${fmt(upgradeTotal(selected,selectedLevel))}</td></tr>`
          : novaVisibleLevels(selected, selectedLevel).map((level, index) => `<tr class="${index < selectedLevel ? 'owned' : ''}"><td>Level ${level.level}</td><td>${novaCost(level)}</td><td>${level.reward || '—'}</td><td>${fmt(upgradeTotal(selected, index + 1))}</td></tr>`).join('')
        : '';

      app.innerHTML = `<div class="breadcrumbs"><a href="#/">Homepage</a> / Nova Shop</div>
        <section class="nova-command">
          <header class="nova-command-head">
            <div><p class="eyebrow">Nova upgrades</p><h1>Nova Shop</h1><p>Track every upgrade, its reward, and your current level.</p><p>Unlimited upgrades initially show levels 1&ndash;50. Level 50 is not a cap: keep pressing + to increase your tracked level. Each level above 50 appears when you reach it, with its cost, reward and running total. You can also enter a higher owned level in the Planner. Limited upgrades keep their normal cap; consumable tokens track quantities.</p></div>
            <div class="nova-currency"><img src="${shop.currency.icon}" alt=""><span>${shop.currency.name}s</span></div>
          </header>
          <div class="nova-command-grid">
            <nav class="nova-category-rail" aria-label="Nova Shop categories">
              ${categoryItems.map(item => `<button data-nova-category="${item.id}" class="${item.id === category ? 'active' : ''}">${categoryIcon(item)}<span>${item.name}</span></button>`).join('')}
            </nav>
            <section class="nova-catalogue">
              <header><div>${categoryIcon(selectedCategory)}</div><h2>${selectedCategory?.name || category}</h2><span>${list.length} entries</span></header>
              <div class="nova-upgrade-list">${list.map(item => {
                const level = item.iconic ? 0 : novaLevelFor(item.id);
                 const progress = item.iconic ? (novaIconicUnlocked(item.name) ? 'Unlocked' : item.novaCrystalCost != null ? `${fmt(item.novaCrystalCost)} Nova to unlock` : 'Limited') : item.comingSoon ? 'Coming soon' : item.repeatable ? `${level} owned` : `${level}/${item.uncapped ? '∞' : item.levels.length}`;
                return `<button data-nova-select="${item.id}" class="nova-upgrade-row ${item.id === selectedId ? 'active' : ''}">${item.iconic ? picture(item.droid, 'DEFAULT') : iconHtml(item)}<span><strong>${item.name}</strong><small>${progress}</small></span></button>`;
              }).join('')}</div>
            </section>
            <aside class="nova-detail-panel">${selected ? selected.iconic ? `
              <div class="nova-detail-summary">${picture(selected.droid, 'DEFAULT')}<div><small>Iconic Droid</small><h2>${selected.name}</h2><p>${selected.description}</p></div></div>
              <dl class="nova-iconic-facts"><div><dt>Type</dt><dd>${selected.droid.type}</dd></div><div><dt>Income</dt><dd>${Math.round(iconicIncome(selected.droid) * 100)}%/s</dd></div><div><dt>Nova cost</dt><dd>${selected.novaCrystalCost != null ? `${fmt(selected.novaCrystalCost)} Nova` : 'Limited event'}</dd></div></dl>
              <label class="nova-iconic-unlock"><input id="novaIconicUnlocked" type="checkbox" ${novaIconicUnlocked(selected.name)?'checked':''} ${state.sharedView&&!state.sharedView.canEdit||isComingSoonDroid(selected.name)?'disabled':''}><span>${isComingSoonDroid(selected.name)?'Unlocks 31 October at 14:00 UTC':'Unlocked permanently'}</span></label>
              <p class="nova-iconic-unlock-note">Tick this after unlocking ${escapeAttr(selected.name)}. Optimise will check when buying a copy would increase your base's credit income. Track copies you currently have in Base.</p>
              <a class="btn" href="#/droid/${slug(selected.name)}">Open droid page</a><a class="btn secondary" href="#/optimise">Check Optimise</a>` : `
               <div class="nova-detail-summary">${iconHtml(selected)}<div><small>${selected.repeatable?'Consumable token':`${maxLabel} level${maxLabel === 1 ? '' : 's'}`}</small><h2>${selected.name}</h2><p>${selected.description}</p>${selected.prerequisite ? `<em>Requires ${selected.prerequisite}</em>` : ''}</div></div>
               <div class="nova-level-control"><button class="btn secondary" id="novaLevelDown" ${selectedLevel <= minimumNovaLevel(selected.id) || selected.comingSoon ? 'disabled' : ''}>−</button><span><small>${selected.repeatable?'Owned':'Tracked level'}</small><strong>${selected.comingSoon ? 'Soon' : selected.repeatable?selectedLevel:`${selectedLevel}/${maxLabel}`}</strong></span><button class="btn" id="novaLevelUp" ${selected.comingSoon || (!selected.uncapped && selectedLevel >= selected.levels.length) ? 'disabled' : ''}>+</button></div>
              <div class="nova-level-table"><table><thead><tr><th>Level</th><th>Cost</th><th>Reward at this level</th><th>Total spent</th></tr></thead><tbody>${detailRows}</tbody></table></div>` : '<p>No entries in this category.</p>'}</aside>
          </div>
        </section>
        ${novaRebirthRewardsHtml(shop)}`;

      document.querySelectorAll('[data-nova-category]').forEach(button => button.onclick = () => {
        category = button.dataset.novaCategory;
        selectedId = '';
        render();
      });
      document.querySelectorAll('[data-nova-select]').forEach(button => button.onclick = () => {
        selectedId = button.dataset.novaSelect;
        render();
      });
      document.querySelector('#novaIconicUnlocked')?.addEventListener('change',event=>{setNovaIconicUnlocked(selected.name,event.target.checked);render()});
      document.querySelector('#novaLevelDown')?.addEventListener('click', () => {
        setNovaLevel(selected.id, selectedLevel - 1);
        render();
      });
      document.querySelector('#novaLevelUp')?.addEventListener('click', () => {
        setNovaLevel(selected.id, selectedLevel + 1);
        render();
      });
    };
    render();
  };

  novaDetailPage = function novaDetailPage(id) {
    const upgrade = novaUpgrade(id);
    if (!upgrade) {
      notFound();
      return;
    }
    localStorage.setItem('droid-archive-nova-category', upgrade.category);
    novaShopPage(id);
  };
}());

function cantinaShopPage(){
  let category=localStorage.getItem('droid-archive-cantina-category')||'boosts',selectedId=localStorage.getItem('droid-archive-cantina-selected')||'';
  const render=()=>{
    const shop=state.cantinaShop;
    if(!shop){app.innerHTML='<h1>Cantina Shop unavailable</h1>';return}
    if(!shop.categories.some(item=>item.id===category))category=shop.categories[0]?.id||'boosts';
    const list=shop.items.filter(item=>item.category===category),selected=list.find(item=>item.id===selectedId)||list[0];
    selectedId=selected?.id||'';localStorage.setItem('droid-archive-cantina-category',category);localStorage.setItem('droid-archive-cantina-selected',selectedId);
    const owned=Boolean(selected&&state.cantinaPurchases?.[selected.id]),details=(selected?.details||[]).map(detail=>`<li>${detail}</li>`).join(''),duration=selected?.durationMinutes?`${selected.durationMinutes} minutes`:'Permanent',novaUnlocks=[...(selected?.novaUnlocks||[]).map(id=>novaUpgrade(id)?.name||id),...Object.entries(selected?.novaLevels||{}).map(([id,level])=>`${novaUpgrade(id)?.name||id} level ${level}`),...Object.entries(selected?.novaLevelGrants||{}).map(([id,count])=>`+${count} ${novaUpgrade(id)?.name||id} levels once`)].join(', ');
    const vbucksIcon='<img src="assets/other/VBucks.png" alt="V-Bucks">',priceHtml=item=>`<span class="cantina-vbucks">${vbucksIcon}${fmt(item.vbucksCost)}</span>${item.novaCost!=null?`<span class="cantina-nova"><img src="${state.novaShop?.currency?.icon||'assets/events/nova-crystal.png'}" alt="">${fmt(item.novaCost)} Nova</span>`:''}`;
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Cantina Shop</div><section class="cantina-hero"><div><p class="eyebrow">Premium shop reference</p><h1>Cantina Shop</h1><p>Compare V-Bucks offers and the Nova Crystal tokens used by temporary lobby boosts.</p></div><span class="cantina-currency">${vbucksIcon} V-Bucks</span></section><div class="cantina-tabs">${shop.categories.map(item=>`<button data-cantina-category="${item.id}" class="${item.id===category?'active':''}">${item.name}</button>`).join('')}</div><div class="cantina-layout"><section class="cantina-grid">${list.map(item=>`<button class="cantina-card ${item.id===selectedId?'active':''} ${state.cantinaPurchases?.[item.id]?'owned':''}" data-cantina-select="${item.id}"><span class="cantina-card-art">${item.icon?`<img src="${item.icon}" alt="">`:vbucksIcon}</span><span><strong>${item.name}</strong><small>${item.durationMinutes?`${item.durationMinutes} min`:'Permanent bundle'}</small></span><span class="cantina-card-prices">${priceHtml(item)}</span>${state.cantinaPurchases?.[item.id]?'<em>Owned</em>':''}</button>`).join('')}</section><aside class="cantina-detail">${selected?`<div class="cantina-detail-head">${selected.icon?`<img src="${selected.icon}" alt="">`:vbucksIcon}<div><small>${shop.categories.find(item=>item.id===selected.category)?.name||selected.category}</small><h2>${selected.name}</h2></div></div><p>${selected.description}</p>${details?`<ul>${details}</ul>`:''}<dl><div><dt>V-Bucks cost</dt><dd><span class="cantina-vbucks">${vbucksIcon}${fmt(selected.vbucksCost)}</span></dd></div>${selected.novaCost!=null?`<div><dt>Nova token cost</dt><dd><span class="cantina-nova"><img src="${state.novaShop?.currency?.icon||'assets/events/nova-crystal.png'}" alt="">${fmt(selected.novaCost)} Nova Crystals</span></dd></div>`:''}<div><dt>Duration</dt><dd>${duration}</dd></div></dl>${selected.category==='packs'?`<label class="cantina-owned-toggle"><input id="cantinaOwned" type="checkbox" ${owned?'checked':''}><span>I own the ${selected.name}</span></label><p class="cantina-unlock-note">Owning this pack automatically tracks ${novaUnlocks} in the Nova Shop.</p>`:`<a class="btn secondary" href="#/nova-shop/${selected.novaUpgradeId}">View this token in Nova Shop</a>`}`:'<p>No item selected.</p>'}</aside></div>`;
    document.querySelectorAll('[data-cantina-category]').forEach(button=>button.onclick=()=>{category=button.dataset.cantinaCategory;selectedId='';render()});
    document.querySelectorAll('[data-cantina-select]').forEach(button=>button.onclick=()=>{selectedId=button.dataset.cantinaSelect;render()});
    document.querySelector('#cantinaOwned')?.addEventListener('change',event=>{state.cantinaPurchases[selected.id]=event.target.checked;if(!event.target.checked)delete state.cantinaPurchases[selected.id];syncCantinaPackUpgrades();save();toast(event.target.checked?`${selected.name} marked owned`:`${selected.name} marked not owned`);render()});
  };
  render()
}

const galacticReportsOpenPage=galacticReportsPage;
galacticReportsPage=()=>{app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Galactic Reports</div><section class="galactic-report-hero"><div><p class="eyebrow">Community data</p><h1>Galactic Reports</h1><p class="lead">We have everything needed, thank you for everyone who contributed!</p></div><span class="report-badge">Complete</span></section>`};

function droidCalcPage(){
  const render=()=>{
    const p=placements();
    app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Droid Calc</div><section class="droid-calc-hero"><p class="eyebrow">Base calculator</p><h1>Droid Calc</h1><p class="lead">Choose a productive Base card and find the first useful quality of every droid that would genuinely improve it.</p></section>${replacementCalculatorHtml(p,{manual:true})}`;
    attachReplacementCalculator(render);
    renderBaseSidebar(render)
  };
  render()
}

async function patchNotesPage(){
  app.querySelector('.archive-timers')?.remove();
  patchNotesPrompted=true;
  app.innerHTML='<div class="loading">Loading patch notes...</div>';
  const notes=state.patchNotes.length?state.patchNotes:await loadPatchNotes();
  state.patchNotes=notes;
  markPatchNotesSeen(notes);
  app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Patch Notes</div><section class="patch-page-head"><div><p class="eyebrow">Release history</p><h1>Patch Notes</h1><p class="lead">See what has changed in Droid Archives. Select an update to read its complete list of changes.</p></div><strong>${notes.length} update${notes.length===1?'':'s'}</strong></section><div class="patch-page-list">${notes.map((note,index)=>`<details class="patch-page-entry" ${index===0?'open':''}><summary><span class="patch-page-date">${note.date||'Update'}</span><span class="patch-page-summary"><strong>${note.title}</strong>${note.summary?`<small>${note.summary}</small>`:''}</span><span class="patch-page-toggle" aria-hidden="true">+</span></summary><div class="patch-page-body"><h2>Full update</h2>${Array.isArray(note.changes)&&note.changes.length?`<ul>${note.changes.map(change=>`<li>${change}</li>`).join('')}</ul>`:'<p>No additional details were supplied for this update.</p>'}</div></details>`).join('')||'<div class="empty">No patch notes have been published yet.</div>'}</div>`;
}
const showUpdateDialogOnce=showPatchNotesOnce;
showPatchNotesOnce=()=>{showUpdateDialogOnce();const link=document.querySelector('#patchNotesTodo');if(link)link.textContent='View Patch Notes'};
todoPage=patchNotesPage;

let lastRoutePath='';
function donatePage(){app.innerHTML=`<div class="breadcrumbs"><a href="#/">Homepage</a> / Donate</div><section class="donate-hero"><div class="donate-hero-copy"><p class="eyebrow">Support the archives</p><h1>Buy me a coffee</h1><p>Droid Archives is a free community project. If it has helped you plan your base, track your collection, or prepare for rebirths, you can optionally support its continued development.</p><a class="donate-button" href="https://buymeacoffee.com/droidarchives" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">☕</span> Support Droid Archives</a></div><div class="donate-coffee" aria-hidden="true"><span>☕</span></div></section><section class="donate-content"><div class="donate-message"><p class="eyebrow">Thank you</p><h2>Your support helps keep this project going</h2><p>Donations help with the time and costs involved in maintaining droid data, images, calculators, profiles, and new features for the community.</p><div class="donate-disclaimer"><strong>Support only — no rewards or benefits</strong><p>Donating is completely voluntary. You will not receive in-game items, site features, account benefits, priority support, or anything else in return. Your donation only supports the continued upkeep and development of Droid Archives.</p></div><p class="donate-free"><strong>Droid Archives remains free for everyone.</strong></p></div><a class="donate-qr-card" href="https://buymeacoffee.com/droidarchives" target="_blank" rel="noopener noreferrer" aria-label="Open the Droid Archives Buy Me a Coffee page"><span>Scan to support</span><img src="assets/other/bmc_qr.png" alt="QR code for the Droid Archives Buy Me a Coffee page"><small>buymeacoffee.com/droidarchives</small></a></section>`}
// ─── Slot choice log ────────────────────────────────────────────────────────
// One row per observed placement: where the droid started, which slots were free
// at that moment, and which one the game gave it. Kept in its own localStorage
// key rather than in the profile — it is research data, it can get long, and
// putting it in the profile would mean touching export, import, validate and the
// cloud schema, any of which could lose a Base. Export from the Slot Lab instead.
const SLOT_LOG_KEY='droid-archive-slot-log';
// Landings you have recorded against the plan on screen. Kept in localStorage
// rather than in memory: tabbing out lets the Supabase session refresh, which
// reloads the profile, and that used to wipe every recording. The dropdowns all
// reset to their placeholder and, worse, the free-slot lists further down the
// plan silently went back to offering slots an earlier step had already taken.
//   Scoped to the profile that produced them, so switching profile shows an empty
// set without anything having to be cleared, and switching back finds them again.
const SLOT_SESSION_KEY='droid-archive-slot-session';
const SLOT_SESSION_MAX=400;
const slotSessionProfile=()=>activeProfile()?.id||'local';
const slotSessionRead=()=>{
  const empty={profileId:slotSessionProfile(),entries:{}};
  try{const store=JSON.parse(localStorage.getItem(SLOT_SESSION_KEY)||'null');
    return store&&store.entries&&store.profileId===slotSessionProfile()?store:empty}
  catch(e){return empty}
};
const slotSessionWrite=store=>{try{localStorage.setItem(SLOT_SESSION_KEY,JSON.stringify(store))}catch(e){}};
const slotLogSession={
  get:text=>slotSessionRead().entries[text]||undefined,
  set(text,spot){
    const store=slotSessionRead();
    delete store.entries[text];store.entries[text]=spot;
    // Insertion-ordered, so trimming the front drops the oldest recordings.
    const keys=Object.keys(store.entries);
    for(const stale of keys.slice(0,Math.max(0,keys.length-SLOT_SESSION_MAX)))delete store.entries[stale];
    slotSessionWrite(store);
  },
  clear(){slotSessionWrite({profileId:slotSessionProfile(),entries:{}})}
};
const slotLogAll=()=>{try{
  const stored=JSON.parse(localStorage.getItem(SLOT_LOG_KEY)||'[]');
  if(!Array.isArray(stored))return[];
  const mine=stored.filter(row=>!row.shared);
  if(mine.length!==stored.length)slotLogWrite(mine);
  return mine;
}catch(e){return[]}};
const slotLogWrite=rows=>{try{localStorage.setItem(SLOT_LOG_KEY,JSON.stringify(rows.slice(-4000)))}catch(e){}};
const slotLogClear=()=>slotLogWrite([]);
const slotLogTracking=()=>{try{return localStorage.getItem('droid-archive-slot-track')==='1'}catch(e){return false}};
const slotLogSetTracking=on=>{try{localStorage.setItem('droid-archive-slot-track',on?'1':'0')}catch(e){}};
// Which slots are free right now, ignoring any this plan has already filled —
// those are gone by the time the next droid is sent.
//   For a droid sent to work the station is part of what is being measured, so
// every station that takes a worker is offered; narrowing it to the planned one
// would throw away the answer. For a droid sent to the Lounge the station is not
// in doubt, only the slot, so the caller passes just that.
function slotLogFree(taken,freed,stations=WORK_STATIONS){
  const placed=placements().placed,out=[];
  const key=spot=>`${spot.station}:${spot.slot}`;
  const vacated=new Set((freed||[]).map(key));
  for(const station of stations){
    const occupied=new Set(placed.filter(x=>x.station===station&&!vacated.has(key(x))).map(x=>x.slot));
    for(const gone of taken||[])if(gone.station===station)occupied.add(gone.slot);
    for(const slot of stationSlotIndices(station))if(!occupied.has(slot))out.push({station,slot});
  }
  return out;
}
const slotLogSame=(a,b)=>Boolean(a)&&Boolean(b)&&a.station===b.station&&a.slot===b.slot;
// A landing is a measurement of a command, never permission to rewrite the
// final layout. A differing recorded landing requires a fresh Base and plan.
function annotateLogSlots(steps){
  if(state.sharedView||!slotLabAllowed()||!slotLogTracking())return;
  const keyOf=x=>`${x.source}:${x.unit}`,current=new Map(placements().placed.map(x=>[keyOf(x),{...x}]));
  for(const step of steps){
    const key=step.unit?keyOf(step.unit):null;
    const to=typeof step.to==='string'?{station:step.to,slot:step.toSlot}:step.to;
    if(step.type==='move'&&(step.workCommand||step.kind==='work'||to?.station==='LOUNGE')){
      const stations=to.station==='LOUNGE'?['LOUNGE']:[...PRODUCTIVE_STATIONS,'UPGRADE_CHIP'];
      step.freeSlots=stations.flatMap(station=>stationSlotIndices(station).filter(slot=>![...current.values()].some(x=>x.station===station&&x.slot===slot)).map(slot=>({station,slot})));
      step.logged=slotLogSession.get(step.text)||null;
    }
    if(['sell','fuse-in','fuse-held'].includes(step.type))current.delete(key);
    else if(step.type==='move'&&to&&current.has(key))current.set(key,{...current.get(key),...to});
    else if(step.type==='swap'&&current.has(key)){
      const other=keyOf(step.withUnit),from=current.get(key),there=current.get(other);
      if(there){current.set(key,{...from,station:there.station,slot:there.slot});current.set(other,{...there,station:from.station,slot:from.slot});}
    }else if(step.type==='fuse'&&step.resultUnit)current.set(keyOf(step.resultUnit),{...step.resultUnit});
    else if(step.type==='fuse-result')for(let i=0;i<step.unit.count;i++){
      const held=[...current].find(([,u])=>u.fusionResult&&u.name===step.unit.name&&u.variant===step.unit.variant);if(held)current.delete(held[0]);
    }
  }
}
function slotLogAdd(row){
  // Only your own saves. A shared Base is somebody else's, and it moves without
  // you: slots get bought and droids get shuffled between your visits, so a row
  // from one is measuring a Base you cannot see the state of.
  if(state.sharedView)return false;
  if(!Number.isInteger(row.landed)||!row.station)return false;
  // A landing outside the free set means the Base is out of date, and a wrong row
  // is worse than no row.
  if(!row.free.some(slot=>slot.station===row.station&&slot.slot===row.landed))return false;
  const rows=slotLogAll();
  // Which of your saves this came from. Profiles differ in rebirth and unlocked
  // slots, so a row is only interpretable next to the one that produced it.
  const profile=activeProfile();
  const source={profileId:profile?.id||'local',profile:profile?.name||'Local save'};
  rows.push({...row,...source,at:new Date().toISOString(),rebirth:state.rebirth});
  slotLogWrite(rows);
  return true;
}

// ─── Scoring the rules against the log ──────────────────────────────────────
// Each rule guesses the landing from the origin and the free set. Whichever
// predicts the log best is the one Optimise should be using.
const SLOT_RULES_UNDER_TEST=[
  {id:'nearest',name:'Nearest free slot to where it started',
   pick:row=>slotLogNearest(row.free,row.fromStation,row.fromSlot)},
  {id:'mission',name:'Own station first, mission slots before the rest',
   pick:row=>{
     // Auto-route sends a droid to its own type of station when one is free.
     const home=row.free.filter(spot=>spot.station===row.droidType);
     const pool=home.length?home:row.free;
     const mission=pool.filter(spot=>spot.station==='ASTROMECH'&&ASTROMECH_MISSION_SLOTS.includes(spot.slot));
     return slotLogNearest(mission.length?mission:pool,row.fromStation,row.fromSlot);
   }},
  {id:'fixed',name:'The station order the app ships with, nearest slot inside it',
   pick:row=>{
     const home=row.free.filter(spot=>spot.station===row.droidType);
     const pool=home.length?home:row.free;
     for(const station of[...PRODUCTIVE_STATIONS,'UPGRADE_CHIP','LOUNGE']){
       const here=pool.filter(spot=>spot.station===station);
       if(!here.length)continue;
       const order=slotFillOrder(station,{station:row.fromStation,slot:row.fromSlot});
       return here.slice().sort((a,b)=>order.indexOf(a.slot)-order.indexOf(b.slot))[0];
     }
     return pool[0];
   }},
];
// Distance between two slots on the map. Both floors are drawn on one image, so
// changing floor gets a flat penalty rather than real geometry.
const SLOT_FLOOR_PENALTY=12;
// A slot with no dot on the map cannot be compared with one that has, so it sorts
// last rather than poisoning the comparison with Infinity.
const SLOT_GAP_UNREACHABLE=1e6;
// Legacy schematic distance for map diagnostics and unmapped allocation
// origins. Work routing uses slotDistanceSquared and never this floor penalty.
function slotWalkGap(from,to){
  const a=slotLogPoint(from.station,from.slot),b=slotLogPoint(to.station,to.slot);
  if(!a||!b)return SLOT_GAP_UNREACHABLE;
  return Math.hypot(b.x-a.x,b.y-a.y)+(a.upstairs!==b.upstairs?SLOT_FLOOR_PENALTY:0);
}
function slotLogPoint(station,slot){
  for(const floor of MAP_FLOORS){
    const spots=MAP_SPOTS[floor]||{};
    const lists=station==='LOUNGE'?[spots.LOUNGE,spots.LOUNGE_REBIRTH,spots.LOUNGE_NOVA]:station==='BLUEPRINT_STORAGE'?[spots.BLUEPRINT]:[spots[station]];
    let base=0;
    for(const list of lists){
      if(list&&slot-base<list.length&&slot-base>=0)return{x:list[slot-base][0],y:list[slot-base][1]*MAP_SIZE.h/MAP_SIZE.w,upstairs:floor==='upstairs'};
      base+=(list||[]).length;
    }
  }
  return null;
}
function slotLogNearest(free,fromStation,fromSlot){
  const start=slotLogPoint(fromStation,fromSlot);
  if(!start||!free.length)return free[0];
  const from={station:fromStation,slot:fromSlot};
  let best=null;
  for(const spot of free){
    const gap=slotWalkGap(from,spot);
    if(gap>=SLOT_GAP_UNREACHABLE)continue;
    if(!best||gap<best.gap)best={spot,gap};
  }
  return best?best.spot:free[0];
}
function slotLogScores(rows){
  return SLOT_RULES_UNDER_TEST.map(rule=>{
    const per={};let hit=0;
    for(const row of rows){
      const right=slotLogSame(rule.pick(row),{station:row.station,slot:row.landed});
      if(right)hit++;
      const bucket=per[row.station]||(per[row.station]={hit:0,n:0});
      bucket.n++;if(right)bucket.hit++;
    }
    return{...rule,hit,n:rows.length,per};
  }).sort((a,b)=>b.hit-a.hit);
}

// ─── Slot Lab ───────────────────────────────────────────────────────────────
// A guided run-through for measuring how the game itself chooses a slot. The map
// positions are placed by hand and only ever approximate, so the fill order has
// to be measured rather than read off them. Every step says what to set up, what
// to do, and how to put the base back for the next one.
//
// Personal tool, hidden unless the signed-in account owns it. This is a static
// site, so that hides the page rather than protecting it — there is nothing here
// worth protecting, only clutter worth keeping out of everyone else's way.
const SLOT_LAB_OWNERS=['xraffo@gmail.com'];
// gmail and googlemail are one account and either can be the address you signed
// in with, so compare a normalised form rather than the raw text.
const normaliseEmail=email=>String(email||'').trim().toLowerCase().replace(/@googlemail\.com$/,'@gmail.com');
const slotLabAllowed=()=>SLOT_LAB_OWNERS.includes(normaliseEmail(galacticUserEmail()));

// The point of the log: which rule actually predicts what the game does.
function slotLogFindingsHtml(){
  const rows=slotLogAll();
  if(!rows.length)return `<section class="lab-phase"><h2>Findings</h2><p class="lab-why">Nothing logged yet. Turn on <strong>Track slot choices</strong> on Optimise, then each step that sends a droid to work gets a box for where it landed. Following your normal plans is enough — no test runs needed.</p></section>`;
  const scores=slotLogScores(rows),stations=[...new Set(rows.map(r=>r.station))];
  const counts=new Map();
  for(const row of rows){const key=row.profileId||'local';
    counts.set(key,{name:row.profile||'Local save',n:(counts.get(key)?.n||0)+1})}
  const byProfile=[...counts.values()].sort((a,b)=>b.n-a.n);
  const pct=(hit,n)=>n?Math.round(hit/n*100):0;
  const head=stations.map(st=>`<th>${stationName(st)}</th>`).join('');
  const body=scores.map(rule=>`<tr><td>${rule.name}</td><td><strong>${pct(rule.hit,rule.n)}%</strong><small>${rule.hit} of ${rule.n}</small></td>${stations.map(st=>{const b=rule.per[st];return `<td>${b?pct(b.hit,b.n)+'%':'—'}<small>${b?b.n+' seen':''}</small></td>`}).join('')}</tr>`).join('');
  const best=scores[0];
  return `<section class="lab-phase"><h2>Findings</h2>
    <p class="lab-why"><strong>${rows.length}</strong> landings recorded during normal play. Each rule guesses the slot from where the droid started and which slots were free; the best one is what Optimise should be using.</p>
    <div class="lab-scores"><table><thead><tr><th>Rule</th><th>Overall</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    ${byProfile.length>1?`<p class="lab-why">Across ${byProfile.length} of your profiles: ${byProfile.map(p=>`<strong>${p.name}</strong> ${p.n}`).join(', ')}. They are pooled on purpose — how the game picks a slot is the same question whatever save you are on — but if one of them has a Base that is out of date, its rows will drag the scores down, so check its share looks sane. Group profiles are never recorded: a Base you only visit moves between visits, so its rows would be measuring a state you cannot check.</p>`:''}
    <p class="lab-why">Leading: <strong>${best.name}</strong> at ${pct(best.hit,best.n)}%. Treat anything under about 200 landings as provisional. Battle still ships a fixed order worked out from the original sweeps, so it is scoring against its own source data and will look better than it is until fresh landings come in — which is exactly what this log is for.</p>
    </section>`;
}
function slotLabPage(){
  if(!slotLabAllowed()){notFound();return}
  const rows=slotLogAll();
  const stamp=new Date().toISOString().slice(0,10);
  app.innerHTML='<div class="breadcrumbs"><a href="#/">Homepage</a> / Slot Lab</div>'+
    '<section class="base-heading"><div><p class="eyebrow">Private tool</p><h1>Slot Lab</h1>'+
    '<p class="lead">Every landing recorded during normal play, and how well each rule predicts them. Turn on <strong>Track slot choices</strong> on Optimise, then each step that sends a droid to work or to the Lounge gets a box for where it actually went.</p></div>'+
    '<div class="lab-actions"><button class="btn" id="labExport">Export</button><button class="btn secondary" id="labCopy">Copy</button><button class="btn ghost" id="labReset">Reset</button></div></section>'+
    slotLogFindingsHtml()+
    (rows.length?'<section class="lab-phase"><h2>The data</h2><p class="lab-why">'+rows.length+' landings, newest last. Export writes the same thing to a file.</p>'+
      '<textarea class="form-control lab-output" id="labOutput" readonly rows="14">'+escapeAttr(JSON.stringify(rows,null,1))+'</textarea></section>':'');

  const text=()=>JSON.stringify(slotLogAll(),null,1);
  const copy=async()=>{
    try{await navigator.clipboard.writeText(text());toast('Log copied')}
    catch(e){const box=document.querySelector('#labOutput');if(box){box.select();toast('Copy the box below')}else toast('Could not reach the clipboard')}
  };
  const reset=()=>{
    if(!confirm('Delete every recorded landing? There is no undo, so export first if you want to keep them.'))return;
    slotLogClear();slotLogSession.clear();toast('Log cleared');slotLabPage();
  };
  document.querySelector('#labExport').onclick=()=>{
    if(!slotLogAll().length){toast('Nothing recorded yet');return}
    // A file rather than the clipboard, so a long log survives being pasted
    // somewhere with a length limit.
    const blob=new Blob([text()],{type:'application/json'}),url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download='droid-archives-slot-log-'+stamp+'.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Exported '+slotLogAll().length+' landings');
  };
  document.querySelector('#labCopy').onclick=copy;
  document.querySelector('#labReset').onclick=reset;
}

// The link only exists for the account that owns the tool.
function syncSlotLabNav(){
  const wanted=slotLabAllowed();
  for(const host of [document.querySelector('.site-header nav'),document.querySelector('.sidebar')]){
    if(!host||document.documentElement.hasAttribute('data-classic-shell')&&!host.matches('.sidebar'))continue;
    const existing=host.querySelector('[data-slot-lab-link]');
    if(!wanted){existing&&existing.remove();continue}
    if(existing)continue;
    const link=document.createElement('a');
    link.href='#/slot-lab';link.dataset.slotLabLink='1';
    link.innerHTML=host.matches('.sidebar')?'<img class="side-icon" src="assets/nav/SlotLab.png" alt=""> <span>Slot Lab</span>':'Slot Lab';
    const before=host.querySelector('[href="#/donate"]');
    if(before)before.before(link);else host.append(link);
  }
  scheduleHeaderNav(true)
}

function journeyGuidePage(){
  const missing=futureRequirements({respectGoal:false}).filter(req=>!hasRequirement(req));
  const rules=normaliseFusionKeepRules(state.fusionKeepRules);
  const cards=state.droids.filter(d=>d.rarity==='EPIC').map(d=>{
    const requirements=missing.filter(req=>req.droidName===d.name);
    const protectedRules=rules.filter(rule=>rule.name?rule.name===d.name:RARITY_LADDER.indexOf(d.rarity)>=RARITY_LADDER.indexOf(rule.rarity));
    if(!requirements.length&&!protectedRules.length)return '';
    return `<div class="guide-droid"><div>${picture(d,'DEFAULT')}</div><div><a href="#/droid/${slug(d.name)}"><strong>${escapeAttr(d.name)}</strong></a>${requirements.map(req=>`<small>R${req.at}: ${requirementVariantText(req.variant)}</small>`).join('')}${protectedRules.map(rule=>`<small>Keep for fusion: ${variantText(rule.variant)}${rule.name?'':' and above'}${rule.upgradeOnly?' ? same-droid upgrade':''}</small>`).join('')}</div></div>`;
  }).join('');
  guidePage({host:app,shop:state.novaShop,owned:state.novaUpgrades,rebirth:state.rebirth,cycle:state.cycle,profileKey:state.cloud.activeProfileId||'local',surgeCards:cards});
}
function route(){refreshKyberRelease(false);const rawHash=location.hash.slice(1),path=isAuthCallbackHash(rawHash)?'/':rawHash.split('?')[0]||'/',routeChanged=path!==lastRoutePath;lastRoutePath=path;if(path==='/todo'||path==='/donate'||path==='/groups'||path==='/companion')app.querySelector('.archive-timers')?.remove();document.querySelector('.sidebar').classList.remove('mobile-open');document.querySelector('#rebirthQuickBar')?.dispose?.();renderBaseSidebar(()=>route());renderCloudHeader();syncSlotLabNav();if(path==='/')home();else if(path==='/reset-password'){home();Promise.resolve(supabaseReady()||loadSupabaseConfig()).then(()=>showAuthModal('reset'))}else if(path==='/shared')archiveExperience.sharedPage();else if(path==='/site-stats')showSiteStats({host:app,client:()=>supabaseClient,allowed:()=>kyberPreviewVerified});else if(path==='/kyber')app.innerHTML=kyberIsReleased(kyberPreviewVerified)?kyberGuide({privateSections:kyberPreviewVerified}):'<h1>Update not available yet</h1><p>This update opens on September 26 at 21:00 BST.</p>';else if(path==='/guide')journeyGuidePage();else if(path==='/site-guide')siteHelpPage(app);else if(path==='/event')eventPage({host:app,getProgress:()=>state.eventProgress,setProgress:value=>{state.eventProgress=value;save()}});else if(path==='/companion')companionPage(app,()=>supabaseClient);else if(path==='/droids')droidsPage();else if(path==='/droidex')droidexPage();else if(path==='/traits')traitsPage(app,state.droids,missionToolsContext(placements().placed));else if(path==='/fusion-lab')fusionLabPage();else if(path==='/nova-shop')novaShopPage();else if(path.startsWith('/nova-shop/'))novaDetailPage(path.split('/')[2]);else if(path==='/cantina-shop')cantinaShopPage();else if(path==='/groups')groupsPage();else if(path==='/galactic-reports'&&GALACTIC_REPORTS_ENABLED)galacticReportsPage();else if(path==='/todo')todoPage();else if(path==='/donate')donatePage();else if(path==='/testmap')basePageV2();else if(path==='/base')basePageV2();else if(path==='/droid-calc')droidCalcPage();else if(['/rebirth','/rebirth/reqs','/rebirth/tracker','/rebirth/tracker/skilltree'].includes(path))rebirthPage();else if(path==='/crit-calc')critCalcPage();else if(path==='/slot-lab')slotLabPage();else if(path==='/optimise')optimisePage();else if(path==='/lucky-droid')luckyDroidPageV2();else if(path.startsWith('/droid/'))detailPage(path.split('/')[2]);else notFound();decorateSharedView();if(routeChanged){try{app.focus({preventScroll:true})}catch{app.focus()}scrollTo(0,0)}setTimeout(showPatchNotesOnce,80);archiveExperience?.checkpoint('Profile opened');publishCompanionState();window.uiHooks?.afterRoute?.(path);siteHelpAfterRoute()}
const routeWithoutActiveNavigation=route;
const activeNavigationHref=path=>path.startsWith('/droid/')||path==='/droids'?'#/droids':path.startsWith('/nova-shop')?'#/nova-shop':path==='/rebirth'||path.startsWith('/rebirth/')?'#/rebirth':`#${path}`;
const COMMAND_ART={party:'Party',crafting:'Crafting',map:'Map',health:'Health',scrap:'Scrap',chips:'Chips',calc:'DroidCalc',outlook:'Outlook',groupOutlook:'GroupOutlook',fusion:'Fusion',detail:'Detail',transfer:'ImportExport'};
const commandIcon=name=>{
  if(name==='notifications')return '<img class="command-icon" src="assets/nav/DroidexNotifications.png" alt="">';
  if(COMMAND_ART[name])return `<img class="command-icon command-art" src="assets/base/${COMMAND_ART[name]}.png" alt="">`;
  const paths={health:'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',scrap:'M5 8h14l-1 11H6L5 8Zm3-3h8l1 3H7l1-3Z',chips:'M5 8h14v8H5V8Zm3-3h8v3H8V5Zm1 7h6M12 9v6',calc:'M6 3h12v18H6V3Zm3 4h6M9 11h1m4 0h1m-6 4h1m4 0h1',outlook:'M4 5h16v14H4V5Zm4-2v4m8-4v4M7 10h3m2 0h5m-10 4h5',detail:'M4 6h16M4 12h16M4 18h10',generic:'M4 6h16M4 12h16M4 18h10',map:'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13',transfer:'M7 7h12m0 0-3-3m3 3-3 3M17 17H5m0 0 3 3m-3-3 3-3',add:'M12 5v14M5 12h14',credits:'M4 7h16v10H4V7Zm3 3h5m-5 4h3',clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',speed:'M5 16a8 8 0 1 1 14 0M12 12l4-4',droids:'M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20v-3a4 4 0 0 1 8 0v3m2 0v-3a4 4 0 0 1 8 0v3',hint:'M12 4a5 5 0 0 0-5 5v3.5L5 16h14l-2-3.5V9a5 5 0 0 0-5-5Zm-2.5 15a2.5 2.5 0 0 0 5 0',fusion:'M7 4v5l-3 5a4 4 0 0 0 4 6h8a4 4 0 0 0 4-6l-3-5V4M7 4h10M9 15h6',settings:'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.5 1.5m-9 9L6 18m12 0-1.5-1.5m-9-9L6 6'};
  return `<svg class="command-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.generic}"/></svg>`
};
function modernMetricIcon(label){label=label.toLowerCase();if(label.includes('minute'))return'clock';if(label.includes('hour'))return'speed';if(label.includes('droid'))return'droids';if(label.includes('rebirth'))return'outlook';return'credits'}
function modernButtonIcon(button){if(button.id==='togglePartyPanel')return'party';if(button.id==='toggleCraftingPanel')return'crafting';if(button.id==='toggleChipSellPanel')return'chips';const text=button.textContent.toLowerCase();if(button.id==='toggleNotificationsPanel')return'notifications';if(text.includes('need'))return'hint';if(text.includes('fusion'))return'fusion';if(text.includes('map'))return'map';if(text.includes('health'))return'health';if(text.includes('scrap'))return'scrap';if(text.includes('chip'))return'chips';if(text.includes('droid calc')||text.includes('replacement'))return'calc';if(text.includes('group outlook'))return'groupOutlook';if(text.includes('outlook'))return'outlook';if(text.includes('import')||text.includes('export'))return'transfer';if(text.includes('add'))return'add';if(text.includes('detail'))return'detail';return'generic'}
function modernBaseSettings(){
  const heading=app.querySelector('.base-heading'),stats=app.querySelector('.base-top');
  if(!heading||!stats||app.querySelector('.modern-base-settings'))return;
  const collapsed=localStorage.getItem('droid-archive-command-settings-collapsed')==='1';
  const optimiseOpen=optimiseSettingsOpen();
  const cycles=Object.keys(state.rebirths),goals=Array.from({length:Math.max(0,maxRebirth()-11)},(_,i)=>i+12);
  const preferredHtml=preferredCompanions().map(name=>{const d=state.droids.find(x=>x.name===name);return `<span class="modern-preferred-companion" title="${escapeAttr(name)}">${d?picture(d,'DEFAULT'):''}<b>${name}</b><button type="button" data-command-remove-companion="${escapeAttr(name)}" title="Remove ${escapeAttr(name)}" aria-label="Remove ${escapeAttr(name)}">×</button></span>`}).join('');
  heading.insertAdjacentHTML('afterend',`<section class="modern-base-settings ${collapsed?'collapsed':''}"><header><span>${commandIcon('settings')}<strong>Base settings</strong><small>Profile controls</small></span><button class="panel-collapse-button" type="button" id="toggleCommandSettings" aria-expanded="${collapsed?'false':'true'}" title="${collapsed?'Expand':'Minimise'} Base settings">${collapsed?'+':'−'}</button></header><div class="modern-settings-body"><label for="commandMultiplier"><small>Current credit multiplier</small><span><span class="deck-stepper is-dual"><span class="deck-stepper-arrows"><button type="button" data-step="up" data-step-for="commandMultiplier" data-step-by="1" tabindex="-1" title="Up by 1" aria-label="Increase by 1">&#9650;</button><button type="button" data-step="down" data-step-for="commandMultiplier" data-step-by="1" tabindex="-1" title="Down by 1" aria-label="Decrease by 1">&#9660;</button></span><input id="commandMultiplier" type="number" min="0" step="0.1" value="${state.multiplier}"><span class="deck-stepper-arrows"><button type="button" data-step="up" data-step-for="commandMultiplier" data-step-by="0.1" tabindex="-1" title="Up by 0.1" aria-label="Increase by 0.1">&#9650;</button><button type="button" data-step="down" data-step-for="commandMultiplier" data-step-by="0.1" tabindex="-1" title="Down by 0.1" aria-label="Decrease by 0.1">&#9660;</button></span></span><b>${effectiveMultiplier().toFixed(2)}×</b></span><em>${multiplierHelp()}</em></label><label><small>Super rebirth</small><select id="commandCycle">${cycles.map(c=>`<option value="${c}" ${Number(c)===state.cycle?'selected':''}>Cycle ${Number(c)+1}</option>`).join('')}</select></label><label for="commandRebirth"><small>Current rebirth</small><span class="deck-stepper"><input id="commandRebirth" type="number" min="0" max="${maxRebirth()}" step="1" value="${state.rebirth}"><span class="deck-stepper-arrows"><button type="button" data-step="up" data-step-for="commandRebirth" tabindex="-1" aria-label="Increase">&#9650;</button><button type="button" data-step="down" data-step-for="commandRebirth" tabindex="-1" aria-label="Decrease">&#9660;</button></span></span></label><label><small>Super rebirth goal</small><select id="commandGoal">${goals.map(n=>`<option value="${n}" ${n===rebirthGoal()?'selected':''}>Rebirth ${n}</option>`).join('')}</select><em>Recommendations stop at this rebirth</em></label><button class="modern-settings-link" type="button" id="toggleCommandOptimise" aria-expanded="${optimiseOpen?'true':'false'}"><span><strong>Advanced settings</strong><em>${optimiseSettingsSummary()}</em></span><b>${optimiseOpen?'−':'+'}</b></button></div><div class="modern-optimise-settings" ${optimiseOpen?'':'hidden'}><section class="modern-optimise-priorities">${protocolPrioritySetting('commandProtocolPriority')}<div class="fusion-keep-control">${fusionKeepSettings()}<button class="btn secondary" type="button" data-fusion-settings>Fusion settings</button><small>Choose variant upgrades, higher rarity or Mythic rerolls.</small></div><div class="fusion-keep-control"><button class="btn secondary" type="button" data-astromech-settings>Astromech Settings</button><small>Choose Mission or Credit Gain for each Iconic.</small></div><div class="fusion-keep-control"><button class="btn secondary" type="button" data-notification-settings>Droidex Notifications</button><small>Prioritise future rebirth droids within your purchased slots.</small></div><label class="side-field modern-min-gain"><span class="modern-min-gain-title">Skip Optimise moves under <i title="Working droids change rooms when the gain clears this threshold. Idle droids can still fill empty work slots. 0 plans every gain, however small.">?</i></span><span class="modern-min-gain-input"><input id="commandOptimiseMinGain" type="number" min="0" max="20" step="0.1" value="${optimiseMinGainPercent()}"><em>% of income</em></span></label></section><section class="modern-companion-settings"><div class="modern-setting-block"><small>Companion boosts</small><div class="modern-setting-pills">${COMPANION_GOALS.map(g=>`<label><input type="checkbox" data-command-companion-goal="${g.id}" ${companionGoals().includes(g.id)?'checked':''}><span>${g.short}</span></label>`).join('')}</div><em>A Companion slot is stocked for each boost picked.</em></div><div class="modern-setting-block"><small>Preferred companions</small><div class="modern-preferred-companions">${preferredHtml}${preferredCompanionsFull()?'':`<button type="button" class="modern-add-companion" id="commandAddPreferredCompanion">${stationIcon('COMPANION')}<span>${preferredCompanions().length?'Add':'Add preferred'}</span></button>`}</div><em>Taken ahead of any boost.</em></div></section><section class="modern-optimise-checks">${iconicPlanningToggleHtml()}<label><input id="commandKeepDroidex" type="checkbox" ${state.optimiseKeepDroidex===false?'':'checked'}><span>Keep droids that can fill the Droidex</span></label><label><input id="commandKeepProtocol" type="checkbox" ${state.optimiseKeepProtocol===false?'':'checked'}><span>Never sell a Protocol droid while a Protocol slot is free</span></label><label><input id="commandAutoCompleteBuilds" type="checkbox" ${state.autoCompleteBuilds?'checked':''}><span>Auto complete Build droids</span></label><label><input id="commandAutoPurchaseSlots" type="checkbox" ${state.autoPurchaseSlots?'checked':''}><span>Auto purchase slots</span></label><label title="When enabled, Optimise tries to clear Build slots. Sell Priority controls which droids may be removed when safe storage is full."><input id="commandOptimiseFreeBuild" type="checkbox" ${state.optimiseFreeBuild?'checked':''}><span>Keep Build slots open in Optimise</span><i>?</i></label><label title="Shows what each droid fuses into on its card in the droid picker."><input id="commandFusionHints" type="checkbox" ${fusionHintsEnabled()?'checked':''}><span>Show fusion uses in the droid picker</span></label><label title="Lets Optimise park spare droids in Fusion slots, the way it uses the Lounge. Anything left standing there is what a Fuse consumes."><input id="commandFusionAsLounge" type="checkbox" ${state.fusionAsLounge?'checked':''}><span>Use Fusion as Lounge slots</span><i>?</i></label><label title="Shows each region's credits and Protocol bonuses above your stations."><input id="commandShowRegionalProduction" type="checkbox" ${state.showRegionalProduction===false?'':'checked'}><span>Show Regional production</span></label></section><label class="modern-sell-priority" ${state.optimiseFreeBuild?'':'hidden'}><small>Sell priority <i title="Choose which droids Optimise is allowed to sell while trying to free Build slots.">?</i></small><select id="commandOptimiseFreeBuildMode">${OPTIMISE_FREE_BUILD_MODES.map(mode=>`<option value="${mode}" ${optimiseFreeBuildMode()===mode?'selected':''}>${optimiseFreeBuildModeLabel(mode)}</option>`).join('')}</select><em>${optimiseFreeBuildModeHelp(optimiseFreeBuildMode())}</em></label><button class="btn danger modern-super-rebirth" type="button" id="commandSuperRebirth">Super rebirth</button></div></section>`);
  const deck=app.querySelector('.modern-base-settings'),rerender=()=>{save();route()};
  deck.querySelector('#toggleCommandSettings').onclick=()=>{const next=!deck.classList.contains('collapsed'),button=deck.querySelector('#toggleCommandSettings');deck.classList.toggle('collapsed',next);localStorage.setItem('droid-archive-command-settings-collapsed',next?'1':'0');button.textContent=next?'+':'−';button.title=`${next?'Expand':'Minimise'} Base settings`;button.setAttribute('aria-expanded',next?'false':'true')};
  deck.querySelectorAll('[data-step-for]').forEach(button=>button.onclick=()=>{const input=deck.querySelector('#'+button.dataset.stepFor);if(!input)return;const by=Number(button.dataset.stepBy);if(by){const low=input.min===''?-Infinity:Number(input.min),high=input.max===''?Infinity:Number(input.max);input.value=String(Math.round(Math.min(high,Math.max(low,(Number(input.value)||0)+(button.dataset.step==='up'?by:-by)))*100)/100)}else button.dataset.step==='up'?input.stepUp():input.stepDown();input.dispatchEvent(new Event('change'))});deck.querySelector('#toggleCommandOptimise').onclick=e=>{const panel=deck.querySelector('.modern-optimise-settings'),open=panel.hidden;panel.hidden=!open;localStorage.setItem('droid-archive-optimise-settings-open',open?'1':'0');e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.querySelector(':scope>b').textContent=open?'−':'+'};
  deck.querySelector('#commandProtocolPriority').onchange=e=>{state.protocolPriority=e.target.value;rerender()};
  deck.querySelector('#commandMultiplier').onchange=e=>{state.multiplier=Math.max(1,Number(e.target.value)||1);rerender()};
  deck.querySelector('#commandCycle').onchange=e=>{state.cycle=Number(e.target.value);rerender()};
  deck.querySelector('#commandRebirth').onchange=e=>changeCurrentRebirth(e.target.value,route);
  deck.querySelector('#commandGoal').onchange=e=>{state.superRebirthGoal=Number(e.target.value)||maxRebirth();rerender()};
  deck.querySelectorAll('[data-command-companion-goal]').forEach(box=>box.onchange=()=>{state.companionGoals=[...deck.querySelectorAll('[data-command-companion-goal]')].filter(x=>x.checked).map(x=>x.dataset.commandCompanionGoal);rerender()});
  deck.querySelectorAll('[data-command-remove-companion]').forEach(button=>button.onclick=()=>{state.preferredCompanions=preferredCompanions().filter(name=>name!==button.dataset.commandRemoveCompanion);rerender()});
  deck.querySelector('#commandAddPreferredCompanion')?.addEventListener('click',()=>showPreferredCompanionPicker(rerender));
  deck.querySelector('#commandKeepDroidex').onchange=e=>{state.optimiseKeepDroidex=e.target.checked;rerender()};
  deck.querySelector('#commandKeepProtocol').onchange=e=>{state.optimiseKeepProtocol=e.target.checked;rerender()};
  deck.querySelector('#commandAutoCompleteBuilds').onchange=e=>{state.autoCompleteBuilds=e.target.checked;rerender()};
  deck.querySelector('#commandAutoPurchaseSlots').onchange=e=>{state.autoPurchaseSlots=e.target.checked;const changed=autoPurchaseEligibleSlots();save();toast(state.autoPurchaseSlots?changed?'Eligible slots purchased':'Auto purchase slots enabled':'Auto purchase slots disabled');route()};
  deck.querySelector('#commandFusionHints').onchange=e=>localStorage.setItem('droid-archive-picker-fusion-hints',e.target.checked?'1':'0');deck.querySelector('#commandFusionAsLounge').onchange=e=>{state.fusionAsLounge=e.target.checked;save();route()};deck.querySelector('#commandShowRegionalProduction').onchange=e=>{state.showRegionalProduction=e.target.checked;save();route()};deck.querySelector('#commandOptimiseFreeBuild').onchange=e=>{state.optimiseFreeBuild=e.target.checked;rerender()};
  deck.querySelector('#commandOptimiseFreeBuildMode').onchange=e=>{state.optimiseFreeBuildMode=e.target.value;rerender()};
  deck.querySelector('#commandOptimiseMinGain').onchange=e=>{state.optimiseMinGainPercent=Math.max(0,Math.min(20,Number(e.target.value)||0));localStorage.setItem('droid-archive-optimise-min-gain',String(state.optimiseMinGainPercent));save();rerender()};
  deck.querySelector('#commandSuperRebirth').onclick=()=>showSuperRebirthConfirm(route)
}
function modernBaseStationLayout(){
  const layout=app.querySelector('.base-layout-v2');if(!layout||layout.querySelector('.modern-center-stations'))return;
  const build=layout.querySelector(':scope>.build-side'),blueprint=layout.querySelector(':scope>.blueprint-side'),special=layout.querySelector(':scope>.special-stations'),lounge=special?.querySelector('.station-lounge'),companion=special?.querySelector('.station-companion'),upgrade=special?.querySelector('.station-upgrade-chip');
  if(!build||!blueprint||!special||!lounge||!companion||!upgrade)return;
  const center=document.createElement('div'),support=document.createElement('div'),fuse=document.createElement('div');
  center.className='modern-center-stations';support.className='modern-support-row';fuse.className='modern-fuse-stations';
  layout.classList.add('modern-station-layout');
  // Build and the storage stations share one column so nothing can drift out of
  // line between them, and the Fusion pair takes the column storage used to own.
  layout.insertBefore(center,build);center.append(build,blueprint,support);support.append(companion,upgrade);
  layout.insertBefore(fuse,center.nextSibling);fuse.append(...special.querySelectorAll('.fusion-panel'));
  // Whatever is left in the special row comes with the Lounge. Naming the three
  // it knew about and dropping the container took the Fusion stations with it,
  // and would take the next one added here too.
  special.replaceWith(...special.children)
}
function modernDroidCardActions(){
  app.querySelectorAll('.base-slot.occupied').forEach(card=>{
    if(card.parentElement?.classList.contains('modern-slot-wrap'))return;
    // Keep the Build completion control inside the card. It is deliberately a
    // full-width footer action in Legacy and is clearer there than squeezed
    // into Modern's small utility-button strip.
    const controls=[...card.children].filter(node=>node.matches?.('.slot-trait,.slot-variant,.slot-lock,.slot-swap,.slot-delete'));
    if(!controls.length)return;
    const actions=document.createElement('div'),menu=document.createElement('div');
    actions.className='slot-card-actions';menu.className='slot-card-menu';
    controls.forEach(button=>{const label=button.classList.contains('slot-trait')?'Edit trait':button.classList.contains('craft-blueprint')?'Craft':button.classList.contains('slot-variant')?'Change quality':button.classList.contains('slot-lock')?'Optimise lock':button.classList.contains('slot-swap')?'Swap droid':'Remove droid';button.dataset.actionLabel=label;button.title=label;menu.append(button)});
    const wrapper=document.createElement('div');wrapper.className='modern-slot-wrap';
    actions.append(menu);card.before(wrapper);wrapper.append(actions,card);
    menu.onclick=event=>event.stopPropagation()
  })
}
let modernTimerScrollFrame=0,modernTimerCompactedAt=0;
// Any render replaces app.innerHTML, and the observer rebuilds the timer strip
// from scratch - at full height, whatever the page is scrolled to. The scroll
// handler then shrinks it, so the animation replays on every re-render even
// though nothing was scrolled. Setting the state before the first paint, with
// transitions suppressed for that frame, makes a rebuild invisible.
function settleModernTimerScroll(){
  const timers=app.querySelector('.archive-timers');if(!timers)return;
  const compact=document.documentElement.dataset.uiStyle==='modern'&&scrollY>110;
  if(compact===timers.classList.contains('timers-scrolled'))return;
  timers.classList.add('timers-settling');
  timers.classList.toggle('timers-scrolled',compact);
  if(compact)modernTimerCompactedAt=performance.now();
  // One frame to paint the new state, a second to hand animation back to CSS.
  requestAnimationFrame(()=>requestAnimationFrame(()=>timers.classList.remove('timers-settling')));
}
function updateModernTimerScroll(){
  const timers=app.querySelector('.archive-timers');if(!timers)return;
  if(document.documentElement.dataset.uiStyle!=='modern'){timers.classList.remove('timers-scrolled');modernTimerCompactedAt=0;return}
  const compact=timers.classList.contains('timers-scrolled'),now=performance.now();
  // Separate enter/exit points stop the timer's own height transition from
  // moving scrollY across one shared boundary and rapidly toggling both states.
  if(!compact&&scrollY>110){timers.classList.add('timers-scrolled');modernTimerCompactedAt=now}
  else if(compact&&scrollY<=4&&now-modernTimerCompactedAt>400){timers.classList.remove('timers-scrolled');modernTimerCompactedAt=0}
}
function scheduleModernTimerScroll(){if(modernTimerScrollFrame)return;modernTimerScrollFrame=requestAnimationFrame(()=>{modernTimerScrollFrame=0;updateModernTimerScroll()})}
window.addEventListener('scroll',scheduleModernTimerScroll,{passive:true});
window.redecorate=()=>decorateCommandDeck(lastRoutePath||location.hash.slice(1).split('?')[0]||'/');
function decorateCommandDeck(path){
  const key=path==='/'?'home':path.startsWith('/droid/')?'droid-detail':path.replace(/^\//,'').replaceAll('/','-')||'home';
  document.documentElement.dataset.route=key;app.dataset.route=key;
  const uiStyle=document.documentElement.dataset.uiStyle,next=uiStyle==='next';if(uiStyle!=='modern'&&!next)return;
  if(!next)app.querySelectorAll('.base-top .stat').forEach(stat=>{if(stat.querySelector('.modern-metric-icon'))return;const label=stat.querySelector('small')?.textContent||'';stat.insertAdjacentHTML('afterbegin',`<span class="modern-metric-icon">${commandIcon(modernMetricIcon(label))}</span>`) });
  if(key==='base'){
    modernBaseStationLayout();
    // The new style keeps each station's Protocol pair at the foot of its card so
    // the three line up; the pair moves into its own grid, handlers and all.
    if(next)app.querySelectorAll('.typed-stations .station').forEach(section=>{const divider=section.querySelector('.slot-grid:not(.protocol-grid)>.protocol-divider');if(!divider)return;const grid=document.createElement('div');grid.className='slot-grid protocol-grid';let node=divider;while(node){const following=node.nextElementSibling;grid.append(node);node=following}section.append(grid)});
    if(!next)modernDroidCardActions();
    const stats=next?null:app.querySelector('.base-top');
    if(stats&&!stats.querySelector('.modern-outlook-stat'))stats.insertAdjacentHTML('beforeend',`<a class="stat modern-outlook-stat" href="#/rebirth"><span class="modern-metric-icon">${commandIcon('outlook')}</span><small>Rebirth outlook</small><strong>Cycle ${state.cycle+1} · ${state.rebirth}</strong><b>›</b></a>`);
    app.querySelectorAll('.base-actions .btn').forEach(button=>{if(button.querySelector('.command-icon'))return;button.insertAdjacentHTML('afterbegin',commandIcon(modernButtonIcon(button)));const clean=button.textContent.replace(/^(Show|Hide)\s+/i,'');if(!next&&button.id!=='toggleBaseMap'&&button.classList.contains('base-panel-toggle'))button.childNodes[button.childNodes.length-1].textContent=` ${clean}`});
    if(!next)modernBaseSettings()
  }
  const firstHeading=next?null:app.querySelector('h1');
  if(firstHeading?.parentElement===app&&!app.querySelector('.command-page-banner')){const eyebrow=firstHeading.previousElementSibling?.classList.contains('eyebrow')?firstHeading.previousElementSibling:null,lead=firstHeading.nextElementSibling?.classList.contains('lead')?firstHeading.nextElementSibling:null,banner=document.createElement('section');banner.className='command-page-banner command-page-heading';app.insertBefore(banner,eyebrow||firstHeading);if(eyebrow)banner.append(eyebrow);banner.append(firstHeading);if(lead)banner.append(lead)}else if(firstHeading)firstHeading.closest('section,article,div')?.classList.add('command-page-heading');
  app.querySelectorAll('.btn').forEach(button=>{if(button.querySelector('.command-icon')||!/(add|apply|view|import|export|compare|save|create|join|copy|submit|track)/i.test(button.textContent))return;button.insertAdjacentHTML('afterbegin',commandIcon(modernButtonIcon(button)))});
  if(!next)app.querySelectorAll('.toolbar,.dex-toolbar,.variant-tabs,.cantina-tabs').forEach(node=>node.classList.add('command-toolbar'))
  if(!next)updateModernTimerScroll()
}
route=()=>{const path=location.hash.slice(1).split('?')[0]||'/',activeHref=activeNavigationHref(path);document.querySelectorAll('#nav a,.sidebar>a').forEach(link=>{const active=link.getAttribute('href')===activeHref;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});routeWithoutActiveNavigation();decorateCommandDeck(path);requestAnimationFrame(()=>{modernTimerCompactedAt=0;decorateCommandDeck(path)});setTimeout(()=>decorateCommandDeck(path),120);scheduleHeaderNav(true)};
function applyTheme(){if(document.documentElement.hasAttribute('data-ui-fixed'))return;document.documentElement.dataset.theme=state.theme;const button=document.querySelector('#themeButton');if(!button)return;button.textContent=state.theme==='dark'?'☀':'☾';button.title=`Switch to ${state.theme==='dark'?'light':'dark'} mode`}
// The top nav has to fold into the hamburger the moment its links stop fitting,
// which is not a width anyone can hard-code: the Slot Lab link only exists for
// its owner, so the same viewport holds a different number of links for
// different people. Watch for the overflow itself instead, and leave the media
// queries as the floor beneath it.
let navFitFrame=0,navFitWidth=-1;
function syncHeaderNav(force){
  const header=document.querySelector('.site-header'),nav=document.querySelector('#nav'),root=document.documentElement;
  if(!header||!nav)return;
  if(root.hasAttribute('data-classic-shell')){delete root.dataset.navFit;root.style.setProperty('--classic-header-height',header.offsetHeight+'px');return;}
  // Folding the nav away leaves the header's own width untouched, so comparing
  // against it both skips redundant work and stops the observer below from
  // reacting to the fold it just caused.
  if(!force&&header.clientWidth===navFitWidth)return;
  navFitWidth=header.clientWidth;
  // Measure with the nav laid out, or a folded nav reports no width at all and
  // could never decide it has room to come back.
  root.dataset.navFit='open';
  if(getComputedStyle(nav).display==='none'){delete root.dataset.navFit;return}
  // Two ways the links stop fitting, one per interface: Modern lets the nav be
  // squashed until it clips its own links, Legacy holds the nav at full width
  // and pushes the header icons off the edge instead.
  if(nav.scrollWidth>nav.clientWidth+1||header.scrollWidth>header.clientWidth+1)root.dataset.navFit='collapsed';
}
const scheduleHeaderNav=force=>{cancelAnimationFrame(navFitFrame);navFitFrame=requestAnimationFrame(()=>syncHeaderNav(force))};
// A resize can be handled before the new width has reached layout, and neither
// a font swap nor a link appearing raises one at all, so the observer is what
// makes this reliable: it only ever fires once the header has really changed.
if(window.ResizeObserver)new ResizeObserver(()=>scheduleHeaderNav()).observe(document.querySelector('.site-header'));
window.addEventListener('resize',()=>scheduleHeaderNav(true));
document.fonts?.ready.then(()=>scheduleHeaderNav(true));
const UI_STYLE_KEY='droid-archive-ui-style';
function applyUiStyle(){if(document.documentElement.hasAttribute('data-ui-fixed'))return;const style=localStorage.getItem(UI_STYLE_KEY)==='legacy'?'legacy':'modern',button=document.querySelector('#uiStyleButton');document.documentElement.dataset.uiStyle=style;if(button){button.querySelector('strong').textContent=style==='modern'?'Classic':'Legacy';button.title=`Switch to ${style==='modern'?'Legacy':'Classic'} style`;button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(style==='modern'))}}
applyUiStyle();applyTheme();renderCloudHeader();scheduleHeaderNav(true);const uiStyleButton=document.querySelector('#uiStyleButton');if(uiStyleButton)uiStyleButton.onclick=()=>{const next=document.documentElement.dataset.uiStyle==='modern'?'legacy':'modern';localStorage.setItem(UI_STYLE_KEY,next);applyUiStyle();route();requestAnimationFrame(updateTimerDocking);toast(`${next==='modern'?'Classic':'Legacy'} style enabled`)};const themeButton=document.querySelector('#themeButton');if(themeButton)themeButton.onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';save();applyTheme();renderCloudHeader()};document.querySelector('#menuButton').onclick=()=>{const sidebar=document.querySelector('.sidebar'),dropdown=document.querySelector('#cloudDropdown'),cloudButton=document.querySelector('#cloudMenuButton');if(dropdown){dropdown.hidden=true;cloudButton?.setAttribute('aria-expanded','false')}sidebar.classList.toggle('mobile-open')};document.addEventListener('click',()=>{const dropdown=document.querySelector('#cloudDropdown'),button=document.querySelector('#cloudMenuButton');if(dropdown){dropdown.hidden=true;button?.setAttribute('aria-expanded','false')}});document.querySelector('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){location.hash='#/droids';setTimeout(()=>{const s=document.querySelector('#droidSearch');if(s){s.value=e.target.value;s.dispatchEvent(new Event('input'))}},20)}});window.addEventListener('hashchange',route);
document.querySelector('#copyDiscord').onclick=async()=>{try{await navigator.clipboard.writeText('.saltea');toast('Discord username copied')}catch{toast('Discord: .saltea')}};
// The dashboard and companion use the same placements and income rules as Base.
let archiveOverviewCache=null;
function archiveOverview(){
  const key=JSON.stringify([profileDataFromState(),activeProfile()?.name,state.sharedView?.profileName,[...fusionWanted()]]);
  if(archiveOverviewCache?.key===key)return archiveOverviewCache.value;
  const p=placements(),income=incomeForPlaced(p.placed),next=(state.rebirths[state.cycle]||[]).find(r=>r.to>state.rebirth);
  const missing=(next?.requiredDroids||[]).filter(req=>!hasRequirement(req)).map(req=>({name:req.droidName,variant:req.variant}));
  const stock=fusionStock(),recipes=fusionRecipes(),ready=recipes.filter(r=>fusionBestVariant(r,stock)),tracked=recipes.filter(r=>fusionWanted().has(r.name));
  const plan=optimiseBase(p,income),layout=optimisedPlacements(p,plan),gain=Math.max(0,incomeForPlaced(layout.placed)-income);
  const cards=[
    {label:'Next rebirth',title:next?`${missing.length} droid requirement${missing.length===1?'':'s'} left for RB ${next.to}`:'Cycle requirements complete',detail:next?(missing.length?missing.slice(0,3).map(d=>`${d.name} ${variantLabel(d.variant)}`).join(' · ')+(missing.length>3?` · +${missing.length-3} more`:''):`Droid requirements met. Check your ${fmt(next.creditsCost)} credit cost in-game.`):'Review your Super Rebirth goal and preparations.',path:'/rebirth',action:'Review rebirth preparation'},
    {label:'Improve your layout',title:gain>1?`+${fmt(gain*3600)}/hour potential`:'Review your Optimise plan',detail:gain>1?'Estimated from rearranging your recorded droids with your current locks and Protocol priority. Review the moves before applying.':'See placements, protected droids and possible fusion steps for this base.',path:'/optimise',action:'Open Optimise'},
    {label:'Fusion opportunities',title:ready.length?`${ready.length} recipe${ready.length===1?'':'s'} with ingredients held`:'Work towards your next fusion',detail:ready.length?`${ready.slice(0,3).map(r=>r.name).join(', ')}. Check quality, rebirth protections and build space before using any inputs.`:tracked.length?`${tracked.length} tracked goal${tracked.length===1?'':'s'}; check the ingredients still missing.`:'Choose a goal in Fusion Lab to see which ingredients to keep.',path:'/fusion-lab',action:'Review fusion ingredients'},
    {label:'Collection and alerts',title:`${state.droidex.length} qualities collected`,detail:'Review missing qualities and set useful notification targets for upcoming rebirths.',path:'/droidex',action:'Open Droidex'}
  ];
  const value={name:state.sharedView?.profileName||activeProfile()?.name||'Your archive',cycle:state.cycle,rebirth:state.rebirth,goal:rebirthGoal(),owned:state.owned.reduce((n,r)=>n+r.qty,0),income,collected:state.droidex.length,total:droidexCapacity(),missing,cards,layout:p.placed.map(d=>({name:d.name,variant:d.variant,station:placeName(d.station),slot:d.slot}))};
  archiveOverviewCache={key,value};return value;
}
function createArchiveProfile(name,data){
  if(state.sharedView||state.cloud.reconnecting)throw Error('Return to your own profile and wait for account loading to finish.');
  const tracker=state.rebirthTracker;
  let validated;
  try{validated=validateBaseImport(cloneProfileData(data));}finally{state.rebirthTracker=tracker;}
  // Validation precedes all changes, and recovery never replaces another save.
  if(cloudConnected())updateActiveCloudProfile();else updateActiveLocalProfile();
  const doc=activeProfileDoc(),id=cloudId();
  const profile={id,name,updatedAt:new Date().toISOString(),data:validated};
  doc.profiles.push(profile);doc.activeProfileId=id;state.cloud.activeProfileId=id;
  applyProfileData(validated);save();
}
function archiveDroidUsefulness(name,variant){
  if(!state.droids.length||state.cloud.reconnecting)return{ready:false,message:'Archives profile is loading'};
  if(state.sharedView)return{ready:false,message:'Open your own profile in Archives for usefulness hints'};
  const d=state.droids.find(d=>d.name===name);
  if(!d||!OWNED_VARIANTS.includes(variant)||(!isIconic(d)&&!d.variants?.[variant])||(isIconic(d)&&variant!=='DEFAULT'))return{ready:false,message:'Droid or quality not recognised'};
  const p=placements(),income=incomeForPlaced(p.placed),protectedKeys=rebirthProtectedKeys(p),hints=[];
  const needs=futureRequirements().filter(req=>req.droidName===name&&!hasRequirement(req)&&rebirthVariantReady(variant,req.variant));
  if(needs.length)hints.push(`Fills a missing requirement at Rebirth ${Math.min(...needs.map(r=>r.at))}`);
  if(!droidexEntry(name,variant))hints.push(`Missing ${variantLabel(variant)} in your Droidex`);
  // Evaluate adding the card to each legal earning slot, with no state mutation.
  // Keep required, locked, unfinished and mission droids in place.
  let best=null;
  for(const station of [...PRODUCTIVE_STATIONS,...Object.keys(PROTOCOL_SLOTS)]){
    if(!canUseStation(d,station))continue;
    for(const slot of stationSlotIndices(station)){
      const occupant=p.placed.find(x=>x.station===station&&x.slot===slot);
      if(occupant&&(occupant.lockedSlot||isBuilding(occupant)||protectedKeys.has(replacementKey(occupant))||missionIconic(state.droids.find(d=>d.name===occupant.name))))continue;
      const candidate={name,variant,station,slot,qty:1,built:true,source:-1,unit:0};
      const next=p.placed.filter(x=>x!==occupant).concat(candidate),gain=incomeForPlaced(next)-income;
      if(gain>1e-7&&(!best||gain>best.gain))best={gain,station,slot,replaces:occupant?.name||null};
    }
  }
  if(best)hints.push(`+${fmt(best.gain*3600)}/hour in ${placeName(best.station)} ${best.slot+1}${best.replaces?` replacing ${best.replaces}`:' (empty slot)'}`);
  const stock=fusionStock();
  if(!stock.has(name))stock.set(name,new Map());
  stock.get(name).set(variant,(stock.get(name).get(variant)||0)+1);
  const completed=fusionRecipes().filter(recipe=>recipe.inputs.includes(name)&&!fusionBestVariant(recipe,fusionStock())&&fusionBestVariant(recipe,stock));
  if(completed.length)hints.push(`Completes the ingredients for ${completed.slice(0,2).map(r=>r.name).join(', ')}; check protected copies before fusing`);
  const spare=[...p.placed,...p.overflow].filter(x=>!x.lockedSlot&&!isBuilding(x)&&!protectedKeys.has(replacementKey(x))&&x.station!=='COMPANION'&&!missionIconic(state.droids.find(d=>d.name===x.name)));
  const copies=spare.filter(x=>x.name===name&&x.variant===variant);
  let qualityFusion=null;
  if(!isIconic(d)&&nextVariant(variant)&&copies.length>=2){
    qualityFusion={name,variant:nextVariant(variant)};
    hints.push(`With two unprotected ${variantLabel(variant)} copies, makes ${variantLabel(qualityFusion.variant)} ${name} through fusion`);
  }
  if(!hints.length)hints.push('No missing collection/rebirth requirement or safe income improvement found');
  return{ready:true,profile:activeProfile()?.name||'Current profile',name,variant,hints,incomeGain:best?.gain||0,rebirths:needs.map(r=>r.at),fusion:completed.map(r=>r.name),qualityFusion,note:'Based on your recorded Base; income assumes an extra, fully built copy.'};
}
// Card operations use a snapshot so a late click cannot change a different profile or copy.
const companionCardSnapshots=new Map();
const companionCardStamp=()=>JSON.stringify([state.cloud.user?.id,state.cloud.activeProfileId,profileDataFromState()]);
function companionCardInfo(name,variant,notUsingBase=false){
  const d=state.droids.find(d=>d.name===name);
  if(!d||!state.rebirths[state.cycle]?.length||!OWNED_VARIANTS.includes(variant)||!d.variants?.[variant]||state.cloud.reconnecting||state.sharedView)return{ready:false,message:'Open your own loaded Archives profile and a recognised card.'};
  const current=notUsingBase?manualCurrentRebirth():state.rebirth;
  const requirements=(state.rebirths[state.cycle]||[]).flatMap(r=>r.to>current?(r.requiredDroids||[]).filter(q=>q.droidName===name).map(q=>({at:r.to,variant:q.variant})):[]);
  const needs=requirements.map(req=>{const ready=rebirthVariantReady(variant,req.variant),chips=chipsToVariant(d,variant,req.variant);return{...req,chips,ready,text:`R ${req.at}: ${variantLabel(req.variant)}${baseVariant(req.variant)==='KYBER'?' (active)':''} - ${ready?'Ready':rebirthActionText(d,variant,req.variant,chips)}`};});
  const p=placements(),matches=[...p.placed,...p.overflow].filter(u=>u.name===name&&u.variant===variant).map(u=>({key:`${u.source}:${u.unit}`,station:u.station,slot:u.slot,label:u.station?`${placeName(u.station)} ${u.slot+1}`:'Unplaced copy',locked:Boolean(u.lockedSlot),building:isBuilding(u)}));
  const token=crypto.randomUUID();
  companionCardSnapshots.set(token,{stamp:companionCardStamp(),name,variant,notUsingBase});
  if(companionCardSnapshots.size>20)companionCardSnapshots.delete(companionCardSnapshots.keys().next().value);
  const slots=Object.keys(SLOT_RULES).filter(station=>optimiseRouteRules().canUse({name,variant},station)).flatMap(station=>stationSlotIndices(station).map(slot=>{const u=p.placed.find(x=>x.station===station&&x.slot===slot);return{station,slot,label:placeName(station),occupant:u?`${u.name} (${variantLabel(u.variant)})`:null,key:u?`${u.source}:${u.unit}`:null,protected:Boolean(u&&(u.lockedSlot||isBuilding(u))),position:slotPosition({station,slot})};}));
  return{ready:true,token,profile:activeProfile()?.name||'Current profile',current,cycle:state.cycle+1,needs,safeToSell:!needs.length&&!isIconic(d),sellable:!isIconic(d),matches,slots,notUsingBase};
}
function companionCardAction(request={}){
  const snapshot=companionCardSnapshots.get(request.token),fail=message=>({ok:false,message});
  if(!snapshot||snapshot.stamp!==companionCardStamp()||state.cloud.reconnecting||state.sharedView)return fail('Your profile changed. Refresh the card before trying again.');
  const {name,variant,notUsingBase}=snapshot,d=state.droids.find(d=>d.name===name),action=request.action;
  if(request.droid!==undefined&&(request.droid!==name||request.variant!==variant))return fail('The scanned card changed. Refresh it before trying again.');
  if(action==='tracker'){
    if(!notUsingBase)return fail('Enable Not using base page to add to Tracker.');
    if(!(state.rebirths[state.cycle]||[]).some(r=>(r.requiredDroids||[]).some(req=>req.droidName===name)))return fail('This droid has no requirements in the current cycle.');
    const current=manualCurrentRebirth();
    state.rebirthTracker.notUsingBase=true;
    state.rebirthTracker.currentByCycle[state.cycle]=current;
    for(const r of state.rebirths[state.cycle]||[])for(const req of r.requiredDroids||[])if(req.droidName===name){state.rebirthTracker.entries[rebirthTrackerKey(r.to,req)]={variant,complete:false,kyberActive:isActiveKyber(variant)};}
    save();route();companionCardSnapshots.delete(request.token);return{ok:true,message:'Added to Droid Tracker',info:companionCardInfo(name,variant,true)};
  }
  if(notUsingBase)return fail('Base actions are disabled in Tracker mode.');
  const p=placements(),all=[...p.placed,...p.overflow],matches=all.filter(u=>u.name===name&&u.variant===variant);
  const source=request.source?matches.find(u=>`${u.source}:${u.unit}`===request.source):matches.length===1?matches[0]:null;
  if(action!=='add'&&!source)return fail(matches.length?'Choose which matching copy is on the card.':'Add this droid to Base first.');
  if(action==='sell'){
    if(isIconic(d))return fail('Iconic droids cannot be sold.');
    const indices=materializePlacements(p);state.owned.splice(indices.get(`${source.source}:${source.unit}`),1);
  }else{
    let target={station:request.station,slot:request.slot},assumed=false;
    if(action==='work'){
      if(isBuilding(source))return fail('Mark this droid as built on Base before sending it to work.');
      target=predictWorkLanding(source,p.placed,optimiseRouteRules());
      if(!target)return fail('No available Work slot. Check your recorded Base.');
      assumed=Boolean(target.assumed);
    }else if(action==='lounge'||action==='companion'&&request.auto){
      target=predictStationLanding(source,p.placed,action==='lounge'?'LOUNGE':'COMPANION',optimiseRouteRules());
      if(!target)return fail('No available destination in your recorded Base. Correct its location on the map.');
      assumed=Boolean(target.assumed);
    }else if(!['add','move','companion'].includes(action))return fail('Unknown card action.');
    if(action==='companion'&&target.station!=='COMPANION')return fail('Choose a Companion slot.');
    if(!stationSlotIndices(target.station).includes(target.slot)||!optimiseRouteRules().canUse({name,variant},target.station))return fail('That slot is not available for this droid.');
    const occupant=p.placed.find(u=>u.station===target.station&&u.slot===target.slot);
    if(action==='add'&&occupant)return fail('Choose an empty slot to add a new copy.');
    if(occupant&&occupant!==source&&(occupant.lockedSlot||isBuilding(occupant)))return fail('That slot contains a locked or unfinished droid.');
    if(occupant&&occupant!==source&&(!source?.station||!optimiseRouteRules().canUse(occupant,source.station)))return fail('These two droids cannot swap slots. Choose an empty slot.');
    const indices=materializePlacements(p);
    if(action==='add')state.owned.push({name,variant,qty:1,built:true,preferred:target.station,preferredSlot:target.slot});
    else{
      const row=state.owned[indices.get(`${source.source}:${source.unit}`)];row.preferred=target.station;row.preferredSlot=target.slot;
      if(occupant&&occupant!==source){const other=state.owned[indices.get(`${occupant.source}:${occupant.unit}`)];other.preferred=source.station;other.preferredSlot=source.slot;}
    }
    save();route();companionCardSnapshots.delete(request.token);
    return{ok:true,message:`${action==='add'?'Added':'Moved'} to ${placeName(target.station)} ${target.slot+1}${assumed?' (predicted; correct the location if needed)':''}`,info:companionCardInfo(name,variant,false),location:{station:target.station,slot:target.slot}};
  }
  save();route();companionCardSnapshots.delete(request.token);return{ok:true,message:'Removed one copy from Base',info:companionCardInfo(name,variant,false)};
}
if(companionMode){window.__companionCardInfo=companionCardInfo;window.__companionCardAction=companionCardAction;}
archiveExperience=createArchiveExperience({
  ready:()=>state.droids.length>0,userId:()=>state.cloud.user?.id,restoring:()=>state.cloud.reconnecting,shared:()=>Boolean(state.sharedView),
  profile:activeProfile,data:profileDataFromState,blank:blankProfileData,cycles:()=>state.rebirths,droids:()=>state.droids,
  variants:name=>{const d=state.droids.find(d=>d.name===name);return isIconic(d)?['DEFAULT']:DISPLAY_VARIANTS.filter(v=>d.variants?.[v]);},
  upgrades:()=>state.novaShop.upgrades.filter(u=>u.category!=='iconic'&&u.levels?.length).map(u=>({id:u.id,name:u.name,max:u.uncapped?10000:novaMaxLevel(u.id)})),
  sampleDroids:()=>['CB','PIT','DRK-1 PROBE','MOUSE','GONK'].filter(name=>state.droids.some(d=>d.name===name)).map(name=>({name,variant:'DEFAULT',qty:1,built:true,...(state.iconicTraits?.[name]?{trait:state.iconicTraits[name]}:{})})),
  createProfile:createArchiveProfile,overview:archiveOverview,app:()=>app,fmt:n=>n===0?'0':fmt(n),toast,publicUrl:()=> 'https://droidarchives.co.uk/',
  go:path=>{if(location.hash===`#${path}`)route();else location.hash=path;},
  cloudHistory:async()=>{
    const owner=state.cloud.user?.id;if(!owner)throw Error('Sign in to load cloud history.');
    const {data,error}=await supabaseClient.from('droid_archive_profile_history').select('id,profiles,revision,archived_at').eq('user_id',owner).order('archived_at',{ascending:false}).limit(40);
    if(error)throw Error(error.message);
    if(state.cloud.user?.id!==owner)throw Error('Your account changed. Reopen history.');
    return(data||[]).flatMap(row=>(Array.isArray(row.profiles)?row.profiles:[]).filter(p=>p?.data&&Array.isArray(p.data.owned)).map(p=>({id:`cloud-${row.id}-${p.id}`,profileId:p.id,name:p.name||'Saved profile',at:row.archived_at,data:p.data,source:`Cloud revision ${row.revision}`})));
  }
});
if(companionMode)window.__companionDroidUsefulness=archiveDroidUsefulness;
let releaseData=null,releaseAudience='',allReleaseNotes=[],previewCheck=0;
function clearKyberPreview(){previewCheck++;kyberPreviewVerified=false;refreshKyberRelease(false)}
async function verifyKyberPreview(){
  const check=++previewCheck;kyberPreviewVerified=false;refreshKyberRelease();
  if(!supabaseClient||!state.cloud.session)return;
  try{const {data,error}=await supabaseClient.auth.getUser();if(check!==previewCheck)return;kyberPreviewVerified=!error&&isKyberPreviewUser(data?.user);refreshKyberRelease()}catch{if(check===previewCheck){kyberPreviewVerified=false;refreshKyberRelease()}}
}
function refreshKyberRelease(rerender=true){setSnowOwner(kyberPreviewVerified);
  if(!releaseData)return;
  const released=kyberIsReleased(kyberPreviewVerified),audience=`${released}:${kyberPreviewVerified}`;
  if(audience===releaseAudience)return;
  releaseAudience=audience;
  const {current,previous,stellarStats}=releaseData;
  const source=released?current:{droids:previous['data/droids.json'],novaShop:previous['data/nova-shop.json'],cantinaShop:previous['data/cantina-shop.json'],cycles:[1,2,3,4,5].map(i=>previous[`data/rebirth-cycles/cycle-${i}.json`])};
  state.droids=applyStellarData(structuredClone(source.droids),stellarStats);
  state.rebirths=Object.fromEntries(structuredClone(source.cycles).map((cycle,index)=>[index,cycle]));
  state.novaShop=structuredClone(source.novaShop);state.cantinaShop=structuredClone(source.cantinaShop);
  VARIANTS=ALL_VARIANTS.slice(0,released?8:7);DISPLAY_VARIANTS=released?OWNED_VARIANTS:VARIANTS;
  const notes=visiblePatchNotes(allReleaseNotes,released),notesChanged=JSON.stringify(notes)!==JSON.stringify(state.patchNotes);
  state.patchNotes=notes;
  // Account verification can change the audience without changing the notes.
  // Preserve the open dialog (and reading position) during that background refresh.
  const dialog=document.querySelector('#modalRoot .patch-notes-backdrop');
  if(dialog&&notesChanged){dialog.remove();patchNotesPrompted=false;showPatchNotesOnce()}
  if(rerender){route();if(released)showPatchNotesOnce()}
}
setInterval(()=>refreshKyberRelease(),10000);
setSnowStatsClient(()=>supabaseClient);
siteActivity=startSiteActivity({client:()=>supabaseClient});
const DATA_VERSION='2026-11-01-scourge-protocol';
const loadJson=async path=>{const response=await fetch(`${path}${path.includes('?')?'&':'?'}v=${DATA_VERSION}`,{cache:'no-cache'});if(!response.ok)throw Error(`Unable to load ${path}`);return response.json()};
function applyStellarData(droids,stellarStats={}){const rules=stellarStats._rules||{},images=stellarStats._images||{},round=value=>Math.round(value*1e6)/1e6;for(const droid of droids){if(images[droid.name])droid.stellarImage=`assets/droids/stellar/${images[droid.name]}`;if(droid.rarity==='ICONIC'||droid.variants.STELLAR)continue;const base=droid.variants.DEFAULT,known=stellarStats[droid.name]||{},costMultiplier=rules.costMultiplier?.[droid.rarity],incomeMultiplier=rules.incomeMultiplier?.[droid.rarity],craftingMultiplier=rules.craftingMultiplier;droid.variants.STELLAR={cost:known.cost??(knownNumber(base?.cost)&&knownNumber(costMultiplier)?round(base.cost*costMultiplier):null),income:known.income??(knownNumber(base?.income)&&knownNumber(incomeMultiplier)?round(base.income*incomeMultiplier):null),craftingSeconds:known.craftingSeconds??(knownNumber(base?.craftingSeconds)&&knownNumber(craftingMultiplier)?round(base.craftingSeconds*craftingMultiplier):null)};if(images[droid.name])droid.stellarImage=`assets/droids/stellar/${images[droid.name]}`;}return droids}
async function loadEvents(){try{const index=await loadJson('data/events/index.json');if(!Array.isArray(index.events))return[];return Promise.all(index.events.map(file=>loadJson(`data/events/${file}`)))}catch{return[]}}
async function loadPatchNotes(){try{const data=await loadJson(`data/patch-notes.json?${Date.now()}`);allReleaseNotes=Array.isArray(data.notes)?data.notes:[];return visiblePatchNotes(allReleaseNotes,kyberIsReleased(kyberPreviewVerified))}catch{return[]}}
Promise.all(['data/droids.json','data/rebirth-cycles/index.json','data/image-manifest.json','data/nova-shop.json','data/cantina-shop.json','data/stellar.json','data/fusion.json','data/pre-kyber.json','data/base-progression.json'].map(loadJson)).then(async([d,cycleIndex,i,novaShop,cantinaShop,stellarStats,fusion,preKyber,progression])=>{state.progression=progression;if(!Array.isArray(cycleIndex.cycles)||!cycleIndex.cycles.length)throw Error('No Super Rebirth cycles are configured.');const [cycles,events]=await Promise.all([Promise.all(cycleIndex.cycles.map(file=>loadJson(`data/rebirth-cycles/${file}`))),loadEvents()]);releaseData={current:{droids:d,cycles,novaShop,cantinaShop},previous:preKyber,stellarStats};state.droids=applyStellarData(d,stellarStats);state.fusion=fusion;state.rebirths=Object.fromEntries(cycles.map((cycle,index)=>[index,cycle]));state.images=i;state.novaShop=novaShop;state.cantinaShop=cantinaShop;state.events=events;refreshKyberRelease(false);normalizeLoadedDroidNames();syncCantinaPackUpgrades();if(!Object.hasOwn(state.rebirths,String(state.cycle)))state.cycle=0;autoPurchaseEligibleSlots();saveLocal();attachModalBehaviour();route();loadPatchNotes().then(notes=>{state.patchNotes=notes;showPatchNotesOnce()});loadSupabaseConfig().then(()=>initSupabaseSafe()).then(()=>{renderCloudHeader();finishAuthCallback()})}).catch(e=>{app.innerHTML=`<h1>Archive unavailable</h1><p>${e.message}</p>`});
// ── Companion Droidex / rebirth bridges ───────────────────────────────────
// Called from the Electron companion (companion mode only); no-op for browsers.
if(companionMode){
  // Add a droid to the Droidex (idempotent), optionally marking it flawless.
  window.__companionAddToDroidex=(name,variant='DEFAULT',flawless=false)=>{
    try{
      const d=state.droids.find(x=>x.name===name);
      if(!d)return{added:false,error:'unknown-droid'};
      const v=OWNED_VARIANTS.includes(variant)?variant:'DEFAULT';
      if(!droidexEntry(name,v))state.droidex.push({name,variant:v,flawless:false});
      if(flawless&&!isIconic(d))state.droidex.filter(x=>x.name===name).forEach(x=>x.flawless=true);
      save();
      return{added:true,name,variant:v,flawless:isDroidFlawless(name)};
    }catch(e){return{added:false,error:String(e&&e.message||e)}}
  };
  // ---- Signing in from the companion's own settings ------------------------
  //
  // The companion has no Supabase client of its own; this page holds the
  // session, so it does the work and reports back. The password arrives as an
  // argument, goes straight to Supabase, and is never stored, logged, or put in
  // anything returned from here.
  window.__companionAuthState=()=>{
    try{
      return{ready:supabaseReady(),signedIn:Boolean(state.cloud.user),
             email:state.cloud.user?.email||'',status:state.cloud.status||''};
    }catch(e){return{ready:false,signedIn:false,email:'',status:String(e&&e.message||e)}}
  };
  window.__companionSignIn=async(email,password,createAccount)=>{
    try{
      if(!supabaseReady())return{ok:false,error:'Cloud sync is not configured.'};
      const address=String(email||'').trim(),secret=String(password||'');
      if(!address||!secret)return{ok:false,error:'Enter an email and password.'};
      state.cloud.initializingNewAccount=Boolean(createAccount);
      const result=createAccount
        ? await supabaseClient.auth.signUp({email:address,password:secret,options:{emailRedirectTo:authRedirectUrl()}})
        : await supabaseClient.auth.signInWithPassword({email:address,password:secret});
      if(result.error)throw result.error;
      state.cloud.session=result.data.session;state.cloud.user=result.data.user;verifyKyberPreview();
      // Signing up with email confirmation on returns no session: there is
      // nothing to load until the link in the email has been followed.
      if(!state.cloud.session&&createAccount){
        state.cloud.initializingNewAccount=false;
        return{ok:true,confirmEmail:true,email:address};
      }
      await loadSupabaseProfiles(true,{initializeIfMissing:Boolean(createAccount)});
      state.cloud.initializingNewAccount=false;
      return{ok:true,signedIn:true,email:state.cloud.user?.email||address};
    }catch(e){
      state.cloud.initializingNewAccount=false;
      return{ok:false,error:String(e&&e.message||e)};
    }
  };
  window.__companionSignOut=async()=>{
    try{await signOutCloud();return{ok:true}}
    catch(e){return{ok:false,error:String(e&&e.message||e)}}
  };
  // Droidex slots this spawn (quality + rarity) would fill, across the same
  // profiles as the rebirth hint.
  //
  // Unlike a rebirth requirement, a Droidex slot is exact: a Galactic spawn does
  // nothing for an empty Gold square. And Iconic droids have only a DEFAULT
  // square, which is why the Droidex page hides the other tabs for them.
  window.__companionDroidexNeed=(quality,rarity,keys)=>{
    try{
      const q=String(quality||'').toUpperCase(),r=String(rarity||'').toUpperCase();
      if(!OWNED_VARIANTS.includes(q))return[];
      const missing=()=>state.droids.filter(d=>String(d.rarity).toUpperCase()===r
        &&(q==='DEFAULT'||!onlyDefaultVariant(d))
        &&!droidexEntry(d.name,q)).map(d=>({droidName:d.name,variant:q}));
      const profiles=chosenNeedProfiles(keys),out=new Map();
      const passes=profiles.length?profiles:[{key:'',name:'',owner:'',data:null}];
      for(const profile of passes){
        for(const hit of profile.data?withProfileData(profile.data,missing):missing()){
          const entry=out.get(hit.droidName)||{droidName:hit.droidName,variant:hit.variant,profiles:[]};
          if(profile.key&&!entry.profiles.some(x=>x.key===profile.key))entry.profiles.push({key:profile.key,name:profile.name,owner:profile.owner});
          out.set(hit.droidName,entry);
        }
      }
      return [...out.values()].sort((left,right)=>left.droidName.localeCompare(right.droidName));
    }catch(e){return{error:String(e&&e.message||e)}}
  };
  // Future-rebirth droids this spawn (quality + rarity) could still fill.
  //
  // Checked across profiles, not just the one loaded: a spawn is worth grabbing
  // if ANY of your saves still needs it, and the alert has to say which — being
  // told you need a droid without being told where is not actionable.
  window.__companionRebirthNeed=(quality,rarity,keys)=>{
    try{
      const q=String(quality||'').toUpperCase(),r=String(rarity||'').toUpperCase(),qi=variantRank(q);
      if(qi<0)return[];
      // One pass over a profile's save. Returns the droids this spawn could
      // still fill for it, and how soon each is wanted.
      const wantedBy=()=>{
        const cycle=state.rebirths?.[state.cycle]||[],found=new Map();
        for(const rb of cycle.filter(x=>x.to>state.rebirth&&x.to<=rebirthGoal()))for(const req of (rb.requiredDroids||[])){
          const d=state.droids.find(x=>x.name===req.droidName);
          if(!d||String(d.rarity).toUpperCase()!==r)continue;      // rarity must match the spawn
          if(variantRank(req.variant)>qi)continue;            // this quality can satisfy the requirement
          if(hasRequirement(req))continue;                          // already owned at a good-enough quality
          const previous=found.get(req.droidName);
          if(!previous||rb.to<previous.rebirth)found.set(req.droidName,{droidName:req.droidName,variant:req.variant,rebirth:rb.to});
        }
        return [...found.values()];
      };
      const profiles=chosenNeedProfiles(keys),out=new Map();
      // No profile document at all (a shared view, say): fall back to whatever
      // is loaded, so the hint degrades to its old single-save behaviour.
      const passes=profiles.length?profiles:[{key:'',name:'',owner:'',data:null}];
      for(const profile of passes){
        for(const hit of profile.data?withProfileData(profile.data,wantedBy):wantedBy()){
          const entry=out.get(hit.droidName)||{droidName:hit.droidName,variant:hit.variant,rebirth:hit.rebirth,profiles:[]};
          if(hit.rebirth<entry.rebirth){entry.rebirth=hit.rebirth;entry.variant=hit.variant}
          if(profile.key&&!entry.profiles.some(x=>x.key===profile.key))entry.profiles.push({key:profile.key,name:profile.name,owner:profile.owner,rebirth:hit.rebirth});
          out.set(hit.droidName,entry);
        }
      }
      // Soonest-wanted first: that is the one worth acting on.
      return [...out.values()].sort((left,right)=>left.rebirth-right.rebirth);
    }catch(e){return{error:String(e&&e.message||e)}}
  };
}

document.addEventListener('change',event=>{
  const key=event.target.dataset?.scrapActivity;if(!key)return;
  const raw=event.target.value.trim(),value=Number(raw);
  if(key==='quality'){
    if(!Object.hasOwn(SCRAP_QUALITIES,raw))return;
    scrapActivity.quality=raw;scrapActivity.swings=null;scrapActivity.cycleSeconds=null;
  }else{
    const min=key==='cycleSeconds'?0.01:key==='swings'?1:0;
    if(raw!==''&&(!Number.isFinite(value)||value<min||(key!=='cycleSeconds'&&!Number.isSafeInteger(value)))){
      event.target.setCustomValidity('Enter a valid positive value, or leave blank.');event.target.reportValidity();return;
    }
    event.target.setCustomValidity('');scrapActivity[key]=raw===''?null:value;
  }
  route();document.querySelector('.scrap-activity')?.setAttribute('open','');
});
document.addEventListener('change',event=>{
  if(!event.target.matches?.('[data-crafting-event]'))return;
  craftingEventMultiplier=Math.max(1,Math.min(100,Number(event.target.value)||1));
  route();
});

 document.addEventListener('change',event=>{
  if(!event.target.matches?.('[data-scrap-station-level]'))return;
  const raw=event.target.value.trim(),value=Number(raw);
  if(raw!==''&&(!Number.isSafeInteger(value)||value<0)){event.target.setCustomValidity('Enter a whole station level of 0 or higher, or leave blank.');event.target.reportValidity();return;}
  event.target.setCustomValidity('');scrapStationLevel=raw===''?null:value;
  route();
  document.querySelector('[data-scrap-station-level]')?.closest('details')?.setAttribute('open','');
});

let purchaseCheckpointFocus=false;
function renderPurchaseCheckpoint(){
  const id=String(state.cloud?.activeProfileId||'local')+'|'+String(state.sharedView?.profile?.id||'');
  if(sessionStorage.getItem('droid-archive-purchase-checkpoint')!==id)return;
  const map=app.querySelector('#baseMapPanel');if(!map)return;
  app.querySelector('[data-purchase-checkpoint]')?.remove();map.hidden=false;
  map.insertAdjacentHTML('beforebegin',`<section class="nova-iconic-purchases" data-purchase-checkpoint><h2>Check where your droids landed</h2><p>Drag droids on the Base map into their actual slots, especially in the Lounge. Then continue with a new route from these positions.</p><button class="btn" type="button" data-continue-optimise>Continue Optimise</button></section>`);
  app.querySelector('[data-continue-optimise]').onclick=()=>{sessionStorage.removeItem('droid-archive-purchase-checkpoint');location.hash='#/optimise';};
}

const eventReminders=startEventReminders({getProgress:()=>state.eventProgress,getProfileKey:()=>JSON.stringify(state.sharedView?['shared',state.sharedView.ownerId,state.sharedView.profileId]:['own',state.cloud.user?.id||'local',state.cloud.activeProfileId]),notify:toast});
if(document.documentElement.hasAttribute('data-classic-shell')){
 const menu=document.querySelector('.sidebar'),button=document.querySelector('#menuButton');
 menu.id='classicMenu';button.setAttribute('aria-controls',menu.id);
 const sync=()=>button.setAttribute('aria-expanded',String(menu.classList.contains('mobile-open')));
 new MutationObserver(sync).observe(menu,{attributes:true,attributeFilter:['class']});sync();
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!button.contains(event.target))menu.classList.remove('mobile-open');});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('mobile-open')){menu.classList.remove('mobile-open');button.focus();}});
}
