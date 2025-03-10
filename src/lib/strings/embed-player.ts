import {Dimensions} from 'react-native'
import {isWeb} from 'platform/detection'
const {height: SCREEN_HEIGHT} = Dimensions.get('window')

export const embedPlayerSources = [
  'youtube',
  'youtubeShorts',
  'twitch',
  'spotify',
  'soundcloud',
  'appleMusic',
  'vimeo',
  'giphy',
  'tenor',
] as const

export type EmbedPlayerSource = (typeof embedPlayerSources)[number]

export type EmbedPlayerType =
  | 'youtube_video'
  | 'youtube_short'
  | 'twitch_video'
  | 'spotify_album'
  | 'spotify_playlist'
  | 'spotify_song'
  | 'soundcloud_track'
  | 'soundcloud_set'
  | 'apple_music_playlist'
  | 'apple_music_album'
  | 'apple_music_song'
  | 'vimeo_video'
  | 'giphy_gif'
  | 'tenor_gif'

export const externalEmbedLabels: Record<EmbedPlayerSource, string> = {
  youtube: 'YouTube',
  youtubeShorts: 'YouTube Shorts',
  vimeo: 'Vimeo',
  twitch: 'Twitch',
  giphy: 'GIPHY',
  tenor: 'Tenor',
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  soundcloud: 'SoundCloud',
}

export interface EmbedPlayerParams {
  type: EmbedPlayerType
  playerUri: string
  isGif?: boolean
  source: EmbedPlayerSource
  metaUri?: string
  hideDetails?: boolean
}

const giphyRegex = /media(?:[0-4]\.giphy\.com|\.giphy\.com)/i
const gifFilenameRegex = /^(\S+)\.(webp|gif|mp4)$/i

export function parseEmbedPlayerFromUrl(
  url: string,
): EmbedPlayerParams | undefined {
  let urlp
  try {
    urlp = new URL(url)
  } catch (e) {
    return undefined
  }

  // youtube
  if (urlp.hostname === 'youtu.be') {
    const videoId = urlp.pathname.split('/')[1]
    const seek = encodeURIComponent(urlp.searchParams.get('t') ?? 0)
    if (videoId) {
      return {
        type: 'youtube_video',
        source: 'youtube',
        playerUri: `https://bsky.app/iframe/youtube.html?videoId=${videoId}&start=${seek}`,
      }
    }
  }
  if (
    urlp.hostname === 'www.youtube.com' ||
    urlp.hostname === 'youtube.com' ||
    urlp.hostname === 'm.youtube.com'
  ) {
    const [_, page, shortVideoId] = urlp.pathname.split('/')
    const videoId =
      page === 'shorts' ? shortVideoId : (urlp.searchParams.get('v') as string)
    const seek = encodeURIComponent(urlp.searchParams.get('t') ?? 0)

    if (videoId) {
      return {
        type: page === 'shorts' ? 'youtube_short' : 'youtube_video',
        source: page === 'shorts' ? 'youtubeShorts' : 'youtube',
        hideDetails: page === 'shorts' ? true : undefined,
        playerUri: `https://bsky.app/iframe/youtube.html?videoId=${videoId}&start=${seek}`,
      }
    }
  }

  // twitch
  if (
    urlp.hostname === 'twitch.tv' ||
    urlp.hostname === 'www.twitch.tv' ||
    urlp.hostname === 'm.twitch.tv'
  ) {
    const parent = isWeb
      ? // @ts-ignore only for web
        window.location.hostname
      : 'localhost'

    const [_, channelOrVideo, clipOrId, id] = urlp.pathname.split('/')

    if (channelOrVideo === 'videos') {
      return {
        type: 'twitch_video',
        source: 'twitch',
        playerUri: `https://player.twitch.tv/?volume=0.5&!muted&autoplay&video=${clipOrId}&parent=${parent}`,
      }
    } else if (clipOrId === 'clip') {
      return {
        type: 'twitch_video',
        source: 'twitch',
        playerUri: `https://clips.twitch.tv/embed?volume=0.5&autoplay=true&clip=${id}&parent=${parent}`,
      }
    } else if (channelOrVideo) {
      return {
        type: 'twitch_video',
        source: 'twitch',
        playerUri: `https://player.twitch.tv/?volume=0.5&!muted&autoplay&channel=${channelOrVideo}&parent=${parent}`,
      }
    }
  }

  // spotify
  if (urlp.hostname === 'open.spotify.com') {
    const [_, typeOrLocale, idOrType, id] = urlp.pathname.split('/')

    if (idOrType) {
      if (typeOrLocale === 'playlist' || idOrType === 'playlist') {
        return {
          type: 'spotify_playlist',
          source: 'spotify',
          playerUri: `https://open.spotify.com/embed/playlist/${
            id ?? idOrType
          }`,
        }
      }
      if (typeOrLocale === 'album' || idOrType === 'album') {
        return {
          type: 'spotify_album',
          source: 'spotify',
          playerUri: `https://open.spotify.com/embed/album/${id ?? idOrType}`,
        }
      }
      if (typeOrLocale === 'track' || idOrType === 'track') {
        return {
          type: 'spotify_song',
          source: 'spotify',
          playerUri: `https://open.spotify.com/embed/track/${id ?? idOrType}`,
        }
      }
    }
  }

  // soundcloud
  if (
    urlp.hostname === 'soundcloud.com' ||
    urlp.hostname === 'www.soundcloud.com'
  ) {
    const [_, user, trackOrSets, set] = urlp.pathname.split('/')

    if (user && trackOrSets) {
      if (trackOrSets === 'sets' && set) {
        return {
          type: 'soundcloud_set',
          source: 'soundcloud',
          playerUri: `https://w.soundcloud.com/player/?url=${url}&auto_play=true&visual=false&hide_related=true`,
        }
      }

      return {
        type: 'soundcloud_track',
        source: 'soundcloud',
        playerUri: `https://w.soundcloud.com/player/?url=${url}&auto_play=true&visual=false&hide_related=true`,
      }
    }
  }

  if (
    urlp.hostname === 'music.apple.com' ||
    urlp.hostname === 'music.apple.com'
  ) {
    // This should always have: locale, type (playlist or album), name, and id. We won't use spread since we want
    // to check if the length is correct
    const pathParams = urlp.pathname.split('/')
    const type = pathParams[2]
    const songId = urlp.searchParams.get('i')

    if (pathParams.length === 5 && (type === 'playlist' || type === 'album')) {
      // We want to append the songId to the end of the url if it exists
      const embedUri = `https://embed.music.apple.com${urlp.pathname}${
        urlp.search ? '?i=' + songId : ''
      }`

      if (type === 'playlist') {
        return {
          type: 'apple_music_playlist',
          source: 'appleMusic',
          playerUri: embedUri,
        }
      } else if (type === 'album') {
        if (songId) {
          return {
            type: 'apple_music_song',
            source: 'appleMusic',
            playerUri: embedUri,
          }
        } else {
          return {
            type: 'apple_music_album',
            source: 'appleMusic',
            playerUri: embedUri,
          }
        }
      }
    }
  }

  if (urlp.hostname === 'vimeo.com' || urlp.hostname === 'www.vimeo.com') {
    const [_, videoId] = urlp.pathname.split('/')
    if (videoId) {
      return {
        type: 'vimeo_video',
        source: 'vimeo',
        playerUri: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      }
    }
  }

  if (urlp.hostname === 'giphy.com' || urlp.hostname === 'www.giphy.com') {
    const [_, gifs, nameAndId] = urlp.pathname.split('/')

    /*
     * nameAndId is a string that consists of the name (dash separated) and the id of the gif (the last part of the name)
     * We want to get the id of the gif, then direct to media.giphy.com/media/{id}/giphy.webp so we can
     * use it in an <Image> component
     */

    if (gifs === 'gifs' && nameAndId) {
      const gifId = nameAndId.split('-').pop()

      if (gifId) {
        return {
          type: 'giphy_gif',
          source: 'giphy',
          isGif: true,
          hideDetails: true,
          metaUri: `https://giphy.com/gifs/${gifId}`,
          playerUri: `https://i.giphy.com/media/${gifId}/giphy.webp`,
        }
      }
    }
  }

  // There are five possible hostnames that also can be giphy urls: media.giphy.com and media0-4.giphy.com
  // These can include (presumably) a tracking id in the path name, so we have to check for that as well
  if (giphyRegex.test(urlp.hostname)) {
    // We can link directly to the gif, if its a proper link
    const [_, media, trackingOrId, idOrFilename, filename] =
      urlp.pathname.split('/')

    if (media === 'media') {
      if (idOrFilename && gifFilenameRegex.test(idOrFilename)) {
        return {
          type: 'giphy_gif',
          source: 'giphy',
          isGif: true,
          hideDetails: true,
          metaUri: `https://giphy.com/gifs/${trackingOrId}`,
          playerUri: `https://i.giphy.com/media/${trackingOrId}/giphy.webp`,
        }
      } else if (filename && gifFilenameRegex.test(filename)) {
        return {
          type: 'giphy_gif',
          source: 'giphy',
          isGif: true,
          hideDetails: true,
          metaUri: `https://giphy.com/gifs/${idOrFilename}`,
          playerUri: `https://i.giphy.com/media/${idOrFilename}/giphy.webp`,
        }
      }
    }
  }

  // Finally, we should see if it is a link to i.giphy.com. These links don't necessarily end in .gif but can also
  // be .webp
  if (urlp.hostname === 'i.giphy.com' || urlp.hostname === 'www.i.giphy.com') {
    const [_, mediaOrFilename, filename] = urlp.pathname.split('/')

    if (mediaOrFilename === 'media' && filename) {
      const gifId = filename.split('.')[0]
      return {
        type: 'giphy_gif',
        source: 'giphy',
        isGif: true,
        hideDetails: true,
        metaUri: `https://giphy.com/gifs/${gifId}`,
        playerUri: `https://i.giphy.com/media/${gifId}/giphy.webp`,
      }
    } else if (mediaOrFilename) {
      const gifId = mediaOrFilename.split('.')[0]
      return {
        type: 'giphy_gif',
        source: 'giphy',
        isGif: true,
        hideDetails: true,
        metaUri: `https://giphy.com/gifs/${gifId}`,
        playerUri: `https://i.giphy.com/media/${
          mediaOrFilename.split('.')[0]
        }/giphy.webp`,
      }
    }
  }

  if (urlp.hostname === 'tenor.com' || urlp.hostname === 'www.tenor.com') {
    const [_, pathOrIntl, pathOrFilename, intlFilename] =
      urlp.pathname.split('/')
    const isIntl = pathOrFilename === 'view'
    const filename = isIntl ? intlFilename : pathOrFilename

    if ((pathOrIntl === 'view' || pathOrFilename === 'view') && filename) {
      const includesExt = filename.split('.').pop() === 'gif'

      return {
        type: 'tenor_gif',
        source: 'tenor',
        isGif: true,
        hideDetails: true,
        playerUri: `${url}${!includesExt ? '.gif' : ''}`,
      }
    }
  }
}

export function getPlayerHeight({
  type,
  width,
  hasThumb,
}: {
  type: EmbedPlayerParams['type']
  width: number
  hasThumb: boolean
}) {
  if (!hasThumb) return (width / 16) * 9

  switch (type) {
    case 'youtube_video':
    case 'twitch_video':
    case 'vimeo_video':
      return (width / 16) * 9
    case 'youtube_short':
      if (SCREEN_HEIGHT < 600) {
        return ((width / 9) * 16) / 1.75
      } else {
        return ((width / 9) * 16) / 1.5
      }
    case 'spotify_album':
    case 'apple_music_album':
    case 'apple_music_playlist':
    case 'spotify_playlist':
    case 'soundcloud_set':
      return 380
    case 'spotify_song':
      if (width <= 300) {
        return 155
      }
      return 232
    case 'soundcloud_track':
      return 165
    case 'apple_music_song':
      return 150
    default:
      return width
  }
}

export function getGifDims(
  originalHeight: number,
  originalWidth: number,
  viewWidth: number,
) {
  const scaledHeight = (originalHeight / originalWidth) * viewWidth

  return {
    height: scaledHeight > 250 ? 250 : scaledHeight,
    width: (250 / scaledHeight) * viewWidth,
  }
}

export function getGiphyMetaUri(url: URL) {
  if (giphyRegex.test(url.hostname) || url.hostname === 'i.giphy.com') {
    const params = parseEmbedPlayerFromUrl(url.toString())
    if (params && params.type === 'giphy_gif') {
      return params.metaUri
    }
  }
}
