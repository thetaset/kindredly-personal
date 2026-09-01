/**
 * Curated package -> category seed map.
 *
 * This OUTRANKS Android's `ApplicationInfo.category`, and that ordering is the
 * whole point. That field is developer-self-reported: WhatsApp, Messenger and
 * Signal all declare CATEGORY_SOCIAL, so a parent who wants "Social blocked,
 * Messaging allowed" — the single most common ask — would get exactly the wrong
 * answer from the declared value alone. Most apps also declare nothing at all.
 *
 * So this table is not a fallback. It is the correction layer, and it only needs
 * to cover the apps that actually turn up on a child's phone. Everything it
 * misses falls through to the declared category and then to a visible 'other'
 * bucket the parent can file by hand — an honest "we don't know" beats a
 * confident wrong guess.
 *
 * A flat const with no logic: cheap to read, cheap to diff, cheap to extend.
 * NOTE: editing an entry silently re-categorises that app for every family, and
 * with it which usage limit the app counts under. `DeviceAppPolicyEntry.categoryId`
 * exists to freeze a parent's view against exactly that churn.
 */

import type { AppCategoryId } from './appCategories';

export const APP_CATEGORY_SEED: Record<string, AppCategoryId> = {
  // --- Games ---------------------------------------------------------------
  'com.roblox.client': 'games',
  'com.mojang.minecraftpe': 'games',
  'com.supercell.clashofclans': 'games',
  'com.supercell.brawlstars': 'games',
  'com.supercell.clashroyale': 'games',
  'com.king.candycrushsaga': 'games',
  'com.king.candycrushsodafarm': 'games',
  'com.kiloo.subwaysurf': 'games',
  'com.innersloth.spacemafia': 'games',
  'com.epicgames.fortnite': 'games',
  'com.activision.callofduty.shooter': 'games',
  'com.dts.freefireth': 'games',
  'com.tencent.ig': 'games',
  'com.miniclip.eightballpool': 'games',
  'com.playrix.homescapes': 'games',
  'com.playrix.gardenscapes': 'games',
  'com.nianticlabs.pokemongo': 'games',
  'com.halfbrick.fruitninjafree': 'games',
  'com.outfit7.mytalkingtomfriends': 'games',
  'com.ea.gp.fifamobile': 'games',
  'com.scopely.monopolygo': 'games',
  'com.robtopx.geometryjump': 'games',
  'air.com.hypah.io.slither': 'games',
  'com.mobile.legends': 'games',
  'com.riotgames.league.wildrift': 'games',
  'com.rovio.baba': 'games',
  'com.ubisoft.dance.justdance': 'games',
  'com.nintendo.zaka': 'games',
  'com.roblox.clientstudio': 'games',
  'com.steam.mobile': 'games',
  'com.valvesoftware.android.steam.community': 'games',

  // --- Social --------------------------------------------------------------
  // Discord sits here rather than under Messaging on purpose: it is an open
  // community platform with strangers in it, and a parent blocking "social"
  // means to catch it.
  'com.instagram.android': 'social',
  'com.instagram.barcelona': 'social',
  'com.snapchat.android': 'social',
  'com.zhiliaoapp.musically': 'social',
  'com.facebook.katana': 'social',
  'com.facebook.lite': 'social',
  'com.twitter.android': 'social',
  'com.reddit.frontpage': 'social',
  'com.pinterest': 'social',
  'com.linkedin.android': 'social',
  'com.tumblr': 'social',
  'com.bereal.ft': 'social',
  'com.discord': 'social',
  'com.tinder': 'social',
  'com.bumble.app': 'social',
  'sh.whisper': 'social',
  'com.yubo.yubo': 'social',
  'ai.character.app': 'social',

  // --- Video & streaming ---------------------------------------------------
  'com.google.android.youtube': 'video',
  'com.google.android.apps.youtube.kids': 'video',
  'com.google.android.apps.youtube.creator': 'video',
  'com.netflix.mediaclient': 'video',
  'com.disney.disneyplus': 'video',
  'com.hulu.plus': 'video',
  'com.amazon.avod.thirdpartyclient': 'video',
  'com.wbd.stream': 'video',
  'tv.twitch.android.app': 'video',
  'com.google.android.videos': 'video',
  'com.peacocktv.peacockandroid': 'video',
  'com.cbs.app': 'video',
  'com.crunchyroll.crunchyroid': 'video',
  'com.plexapp.android': 'video',
  'org.videolan.vlc': 'video',
  'com.apple.atve.androidtv.appletv': 'video',

  // --- Music & audio -------------------------------------------------------
  'com.spotify.music': 'music',
  'com.spotify.lite': 'music',
  'com.google.android.apps.youtube.music': 'music',
  'com.apple.android.music': 'music',
  'com.amazon.mp3': 'music',
  'com.pandora.android': 'music',
  'com.soundcloud.android': 'music',
  'deezer.android.app': 'music',
  'com.aspiro.tidal': 'music',
  'com.audible.application': 'music',
  'com.shazam.android': 'music',
  'au.com.shiftyjelly.pocketcasts': 'music',
  'com.google.android.apps.podcasts': 'music',

  // --- Messaging & calls ---------------------------------------------------
  // Every one of these declares CATEGORY_SOCIAL. This block is the single
  // biggest reason the seed map has to outrank the declared value.
  'com.whatsapp': 'communication',
  'com.whatsapp.w4b': 'communication',
  'org.telegram.messenger': 'communication',
  'com.facebook.orca': 'communication',
  'com.facebook.mlite': 'communication',
  'org.thoughtcrime.securesms': 'communication',
  'com.google.android.apps.messaging': 'communication',
  'com.google.android.dialer': 'communication',
  'com.samsung.android.messaging': 'communication',
  'com.samsung.android.dialer': 'communication',
  'com.android.mms': 'communication',
  'com.viber.voip': 'communication',
  'com.skype.raider': 'communication',
  'us.zoom.videomeetings': 'communication',
  'com.microsoft.teams': 'communication',
  'com.google.android.apps.tachyon': 'communication',
  'com.groupme.android': 'communication',
  'com.imo.android.imoim': 'communication',
  'com.Slack': 'communication',
  'com.life360.android.safetymapd': 'communication',

  // --- Learning ------------------------------------------------------------
  'com.duolingo': 'learning',
  'org.khanacademy.android': 'learning',
  'com.quizlet.quizletandroid': 'learning',
  'com.microblink.photomath': 'learning',
  'com.google.android.apps.classroom': 'learning',
  'com.instructure.candroid': 'learning',
  'co.brainly': 'learning',
  'com.chegg': 'learning',
  'com.coursera.android': 'learning',
  'com.udemy.android': 'learning',
  'org.edx.mobile': 'learning',
  'com.memrise.android.memrisecompanion': 'learning',
  'com.babbel.mobile.android.en': 'learning',
  'com.getepic.Epic': 'learning',
  'com.wolfram.android.alpha': 'learning',
  'org.wikipedia': 'learning',
  'com.symbolab.symbolab': 'learning',
  'com.desmos.calculator': 'learning',
  'com.google.android.apps.arts.artsandculture': 'learning',
  'com.tinkercad.android': 'learning',
  'org.scratchjr.android': 'learning',
  'com.sololearn': 'learning',

  // --- Creative & photos ---------------------------------------------------
  'com.google.android.apps.photos': 'creative',
  'com.adobe.lrmobile': 'creative',
  'com.adobe.spark.post': 'creative',
  'com.canva.editor': 'creative',
  'com.picsart.studio': 'creative',
  'com.vsco.cam': 'creative',
  'com.lemon.lvoverseas': 'creative',
  'com.google.android.GoogleCamera': 'creative',
  'com.sec.android.app.camera': 'creative',
  'com.android.camera2': 'creative',
  'com.medibang.android.paint.tablet': 'creative',
  'com.brakefield.painter': 'creative',
  'com.ibis.ibispaintx.app': 'creative',
  'com.garageband.android': 'creative',

  // --- Productivity --------------------------------------------------------
  'com.google.android.gm': 'productivity',
  'com.google.android.apps.docs': 'productivity',
  'com.google.android.apps.docs.editors.docs': 'productivity',
  'com.google.android.apps.docs.editors.sheets': 'productivity',
  'com.google.android.apps.docs.editors.slides': 'productivity',
  'com.google.android.keep': 'productivity',
  'com.google.android.calendar': 'productivity',
  'com.microsoft.office.outlook': 'productivity',
  'com.microsoft.office.word': 'productivity',
  'com.microsoft.office.excel': 'productivity',
  'com.microsoft.office.powerpoint': 'productivity',
  'com.microsoft.office.onenote': 'productivity',
  'com.notion.id': 'productivity',
  'com.evernote': 'productivity',
  'com.todoist': 'productivity',
  'com.dropbox.android': 'productivity',
  'com.openai.chatgpt': 'productivity',
  'com.anthropic.claude': 'productivity',
  'com.google.android.apps.bard': 'productivity',

  // --- Shopping & money ----------------------------------------------------
  'com.amazon.mShop.android.shopping': 'shopping',
  'com.ebay.mobile': 'shopping',
  'com.etsy.android': 'shopping',
  'com.contextlogic.wish': 'shopping',
  'com.zzkko': 'shopping',
  'com.einnovation.temu': 'shopping',
  'com.walmart.android': 'shopping',
  'com.target.ui': 'shopping',
  'com.paypal.android.p2pmobile': 'shopping',
  'com.venmo': 'shopping',
  'com.squareup.cash': 'shopping',
  'com.google.android.apps.walletnfcrel': 'shopping',
  'com.robinhood.android': 'shopping',
  'com.coinbase.android': 'shopping',
  'com.greenlight.financial.mobile': 'shopping',

  // --- News & reading ------------------------------------------------------
  'com.google.android.apps.magazines': 'news',
  'flipboard.app': 'news',
  'com.nytimes.android': 'news',
  'com.washingtonpost.android': 'news',
  'bbc.mobile.news.ww': 'news',
  'com.cnn.mobile.android.phone': 'news',
  'com.google.android.apps.books': 'news',
  'com.amazon.kindle': 'news',
  'wp.wattpad': 'news',
  'com.goodreads': 'news',
  'com.medium.reader': 'news',
  'com.overdrive.mobile.android.libby': 'news',

  // --- Other browsers ------------------------------------------------------
  // Their own bucket, and the single highest-leverage protection in the product.
  // Kindredly's content filtering only exists INSIDE the Kindredly browser —
  // Chrome on Android has no extension support — so any third-party browser is a
  // completely unfiltered door onto the open web, and opening one silently voids
  // every web control the family has configured.
  //
  // Coverage here is the protection. A browser we forget to name is a hole, and
  // unlike a blocked app nobody complains about it, so it is never discovered.
  'com.android.chrome': 'browsers',
  'com.chrome.beta': 'browsers',
  'com.chrome.dev': 'browsers',
  'com.chrome.canary': 'browsers',
  'org.mozilla.firefox': 'browsers',
  'org.mozilla.firefox_beta': 'browsers',
  'org.mozilla.focus': 'browsers',
  'org.mozilla.klar': 'browsers',
  'com.microsoft.emmx': 'browsers',
  'com.brave.browser': 'browsers',
  'com.brave.browser_beta': 'browsers',
  'com.opera.browser': 'browsers',
  'com.opera.browser.beta': 'browsers',
  'com.opera.mini.native': 'browsers',
  'com.opera.gx': 'browsers',
  'com.duckduckgo.mobile.android': 'browsers',
  'com.sec.android.app.sbrowser': 'browsers',
  'com.sec.android.app.sbrowser.beta': 'browsers',
  'com.UCMobile.intl': 'browsers',
  'com.uc.browser.en': 'browsers',
  'com.vivaldi.browser': 'browsers',
  'com.kiwibrowser.browser': 'browsers',
  'org.torproject.torbrowser': 'browsers',
  'com.yandex.browser': 'browsers',
  'mark.via.gp': 'browsers',
  'acr.browser.lightning': 'browsers',
  'com.mi.globalbrowser': 'browsers',
  'com.heytap.browser': 'browsers',
  'com.transsion.phoenix': 'browsers',
  'com.huawei.browser': 'browsers',
  'com.ecosia.android': 'browsers',
  'com.qwant.liberty': 'browsers',
  'com.aloha.browser': 'browsers',
  'com.jio.web': 'browsers',
  'com.cloudmosa.puffinFree': 'browsers',
  'org.adblockplus.browser': 'browsers',
  'com.explore.web.browser': 'browsers',
  'net.onecook.browser': 'browsers',
  'io.github.forkmaintainers.iceraven': 'browsers',

  // --- App stores ----------------------------------------------------------
  // Blocking these is what stops "I'll just install a different browser" from
  // being a one-tap bypass of everything above. Includes the sideload-friendly
  // stores, which are the ones a motivated teenager actually reaches for.
  'com.android.vending': 'stores',
  'com.sec.android.app.samsungapps': 'stores',
  'com.amazon.venezia': 'stores',
  'com.huawei.appmarket': 'stores',
  'com.xiaomi.mipicks': 'stores',
  'com.heytap.market': 'stores',
  'com.bbk.appstore': 'stores',
  'com.oppo.market': 'stores',
  'cm.aptoide.pt': 'stores',
  'com.apkpure.aegon': 'stores',
  'com.uptodown.android': 'stores',
  'org.fdroid.fdroid': 'stores',
  'com.aurora.store': 'stores',
  'com.github.yeriomin.yalpstore': 'stores',
  // Epic and itch can install Android packages, so they belong here. The Steam
  // mobile app cannot — it stays under games (already seeded above), or "block app
  // stores" would take out a chat/library client that installs nothing.
  'com.epicgames.portal': 'stores',
  'com.itch.itchio': 'stores',
  'ru.vk.store': 'stores',
  'com.farsitel.bazaar': 'stores',
  'com.tencent.android.qqdownloader': 'stores',

  // --- Utilities & system --------------------------------------------------
  'com.google.android.apps.maps': 'utilities',
  'com.waze': 'utilities',
  'com.google.android.apps.nbu.files': 'utilities',
  'com.google.android.calculator': 'utilities',
  'com.google.android.deskclock': 'utilities',
  'com.android.settings': 'utilities',
  'com.google.android.apps.authenticator2': 'utilities',
  'com.lastpass.lpandroid': 'utilities',
  'com.agilebits.onepassword': 'utilities',
  'com.google.android.apps.translate': 'utilities',
  'com.sec.android.app.myfiles': 'utilities',
  'com.google.android.apps.wellbeing': 'utilities',
  'com.ubercab': 'utilities',
  'com.lyft.android': 'utilities',
  'com.google.android.apps.fitness': 'utilities',
  'com.strava': 'utilities',
  'com.myfitnesspal.android': 'utilities',
  'com.google.android.apps.chromecast.app': 'utilities',
  'com.spotify.tv.android': 'utilities',

  // --- macOS bundle ids ------------------------------------------------------
  // A computer's apps land in the same table because a category is a category: a
  // parent limiting "Games" means Steam on the Mac and Roblox on the phone, and
  // splitting the map per platform would make that one decision two edits.
  // Bundle ids are their own namespace, so nothing here can shadow a package name
  // above — except where the SAME app ships under one id on both (Spotify), which
  // is exactly when one row is the right answer.
  'com.valvesoftware.steam': 'games',
  'com.epicgames.EpicGamesLauncher': 'games',
  'net.battle.app': 'games',
  'com.riotgames.RiotClient': 'games',
  'com.mojang.minecraftlauncher': 'games',
  'com.roblox.RobloxPlayer': 'games',
  'com.roblox.RobloxStudio': 'games',
  'com.ea.origin': 'games',
  'com.gog.galaxy': 'games',
  'com.hnc.Discord': 'social',
  'com.apple.MobileSMS': 'communication',
  'com.apple.FaceTime': 'communication',
  'net.whatsapp.WhatsApp': 'communication',
  'ru.keepcoder.Telegram': 'communication',
  'org.whispersystems.signal-desktop': 'communication',
  'com.tinyspeck.slackmacgap': 'communication',
  'us.zoom.xos': 'communication',
  'com.microsoft.teams2': 'communication',
  'com.apple.TV': 'video',
  'com.netflix.Netflix': 'video',
  'tv.plex.desktop': 'video',
  'com.apple.Music': 'music',
  'com.spotify.client': 'music',
  'com.apple.podcasts': 'music',
  'com.apple.iMovieApp': 'creative',
  'com.apple.garageband10': 'creative',
  'com.apple.Photos': 'creative',
  'com.figma.Desktop': 'creative',
  'com.adobe.Photoshop': 'creative',
  'org.blenderfoundation.blender': 'creative',
  'com.microsoft.VSCode': 'productivity',
  'com.apple.dt.Xcode': 'productivity',
  'com.apple.Notes': 'productivity',
  'com.apple.iWork.Pages': 'productivity',
  'com.apple.iWork.Keynote': 'productivity',
  'com.apple.iWork.Numbers': 'productivity',
  'com.microsoft.Word': 'productivity',
  'com.microsoft.Excel': 'productivity',
  'com.microsoft.Powerpoint': 'productivity',
  'notion.id': 'productivity',
  'com.apple.mail': 'productivity',
  'com.apple.iCal': 'productivity',
  'com.apple.reminders': 'productivity',
  'com.apple.iBooksX': 'news',
  'com.apple.news': 'news',
  'com.duolingo.DuolingoMobile': 'learning',
  'com.scratch.scratch-desktop': 'learning',
  'com.apple.AppStore': 'stores',
  'com.google.Chrome': 'browsers',
  'com.apple.Safari': 'browsers',
  // Firefox ships under `org.mozilla.firefox` on both Android and macOS — it is already
  // seeded under Other browsers above, and one row is the right answer for one app.
  'com.microsoft.edgemac': 'browsers',
  'com.brave.Browser': 'browsers',
  'com.operasoftware.Opera': 'browsers',
  'company.thebrowser.Browser': 'browsers',
  'com.apple.finder': 'utilities',
  'com.apple.systempreferences': 'utilities',
  'com.apple.Terminal': 'utilities',
  'com.apple.ActivityMonitor': 'utilities',
  'com.apple.Preview': 'utilities',
  'com.apple.calculator': 'utilities',
  'com.apple.Maps': 'utilities',
  'com.agilebits.onepassword7': 'utilities',
  'com.1password.1password': 'utilities',

  // --- VPN & proxy -----------------------------------------------------------
  // A VPN moves the child's traffic off whatever network the family filters on, so
  // these belong to the parent's decision even though none of them is "bad".
  'ch.protonvpn.mac': 'vpn',
  'com.windscribe.client': 'vpn',
  'com.nordvpn.macos': 'vpn',
  'com.expressvpn.ExpressVPN': 'vpn',
  'com.privateinternetaccess.vpn': 'vpn',
  'com.wireguard.macos': 'vpn',
  'net.openvpn.connect.app': 'vpn',
  'com.protonvpn.android': 'vpn',
  'com.windscribe.vpn': 'vpn',
  'com.nordvpn.android': 'vpn',
  'com.expressvpn.vpn': 'vpn',
  'org.torproject.android': 'vpn',
  'free.vpn.unblock.proxy.turbovpn': 'vpn',
  'com.free.vpn.super.hotspot.open': 'vpn',

  // --- Remote access ---------------------------------------------------------
  // A second computer the family cannot see. Screen sharing and KVM software belong
  // here for the same reason mirroring does: whatever runs on the far end is
  // entirely outside every control set on this device.
  'com.philandro.anydesk': 'remote',
  'org.deskflow.deskflow': 'remote',
  'barrier': 'remote',
  'com.apple.ScreenContinuity': 'remote',
  'com.apple.ScreenSharing': 'remote',
  'com.teamviewer.TeamViewer': 'remote',
  'com.realvnc.vncviewer': 'remote',
  'com.microsoft.rdc.macos': 'remote',
  'com.parsecgaming.parsec': 'remote',
  'com.teamviewer.teamviewer': 'remote',
  'com.anydesk.anydeskandroid': 'remote',
  'com.microsoft.rdc.android': 'remote',
  'com.google.chromeremotedesktop': 'remote',

  // --- macOS: apps seen on real family devices -------------------------------
  // Bundle ids read from the installed apps rather than guessed from their names.
  // Firefox Developer Edition is the one that mattered most: it is a full browser
  // under its own id, so "Block other browsers" walked straight past it.
  'org.mozilla.firefoxdeveloperedition': 'browsers',
  'org.mozilla.nightly': 'browsers',
  'com.vivaldi.Vivaldi': 'browsers',

  // Both would otherwise be caught by the com.apple.* fallback and filed as system
  // utilities, which is exactly wrong for the one category a parent most wants.
  'com.apple.Chess': 'games',
  'com.apple.games': 'games',

  'org.gimp.gimp': 'creative',
  'org.krita': 'creative',
  'org.inkscape.Inkscape': 'creative',
  'com.Meltytech.Shotcut': 'creative',
  'com.obsproject.obs-studio': 'creative',
  'com.diffusionbee.diffusionbee': 'creative',
  'org.upscayl.Upscayl': 'creative',
  'net.tsukumijima.real-esrgan-gui': 'creative',
  'com.apple.GenerativePlaygroundApp': 'creative',
  'com.apple.PhotoBooth': 'creative',
  'com.apple.freeform': 'creative',

  'com.google.android.studio': 'productivity',
  'ai.elementlabs.lmstudio': 'productivity',
  'com.anthropic.claudefordesktop': 'productivity',
  'org.pgadmin.pgadmin4': 'productivity',
  'com.github.CopilotForXcode': 'productivity',
  'com.apple.TestFlight': 'productivity',
  'com.apple.Automator': 'productivity',
  'com.apple.TextEdit': 'productivity',
  'com.apple.Stickies': 'productivity',
  'com.apple.journal': 'productivity',
  'stirling.pdf.dev': 'productivity',

  'org.libation.macos': 'news',

  'com.nuebling.mac-mouse-fix': 'utilities',
  'com.nektony.Memory-Cleaner-SIII': 'utilities',
};
