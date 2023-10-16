"use client"

import awsConfig from '@/src/aws-exports'
import { Amplify, API, graphqlOperation } from 'aws-amplify'
import { GraphQLResult, GraphQLSubscription } from '@aws-amplify/api'

import * as s from '@/src/graphql/subscriptions'
import * as m from '@/src/graphql/mutations'
import { JamSession, JamSessionSlideConfig, JamSong, NextKey, NextPage, OnNextPageSubscription, OnNextSongSubscription, OnSongKeySubscription, OnJamSlideConfigChangeSubscription } from "@/src/API"
import { useEffect, useState } from "react"
import { ChevronDoubleRightIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid'
import Controls from './controls'
import { useSideBarContext } from '../context'

import { default as PSlides } from "./slides"
import { default as SSlides } from '../(slides)/slides'
import { useTheme } from 'next-themes'

export interface PlayerProps {
  jam: JamSession, isSlideShow?: boolean
}

Amplify.configure({ ...awsConfig, ssr: true });

// http://192.168.68.128:3000/jam/95b1a549-127f-4a38-96c4-8dabfbb35bc1
export default function Player(p: PlayerProps) {
  const theme = useTheme()
  const { setOpenSidebar } = useSideBarContext()
  
  const [ isFullScreenEnabled, setFullScreenEnabled ] = useState(false)
  useEffect(() => { setFullScreenEnabled(document?.fullscreenEnabled || (document as any)?.webkitFullscreenEnabled) }, [])

  const [ song, setSong ] = useState(p.jam.currentSong || 0)
  const [ sKey, setSKey ] = useState(p.jam.setList.songs[p.jam.currentSong || 0]?.key || "C")
  const [ page, setPage ] = useState(p.jam.currentPage || 0)

  const [ isLastPage, setLastPage ] = useState(false)

  const [transpose, setTranspose] = useState(0)
  const setCapo = (c: string) => { setTranspose(0-Number(c)) }

  const [ textSize, setTextSize ] = useState("text-lg")
  useEffect(() => { const a = localStorage.getItem('jam/textSize') || "text-lg"; if (a && a != "false") { setTextSize(a) } }, [])
  useEffect(() => { localStorage.setItem('jam/textSize', textSize) }, [textSize])
  
  const [ complex, setComplex ] = useState(true)
  useEffect(() => { const a = localStorage.getItem('jam/complex') || "true"; if (a) { setComplex(a === "true") } }, [])
  useEffect(() => { localStorage.setItem('jam/complex', JSON.stringify(complex)) }, [complex])

  const [ fullScreen, setFullScreen ] = useState(false)

  const [ headsUp, setHeadsUp ] = useState(false)
  useEffect(() => { const a = localStorage.getItem('jam/headsUp') || "false"; if (a) { setHeadsUp(a === "true") } }, [])
  useEffect(() => { localStorage.setItem('jam/headsUp', JSON.stringify(headsUp)) }, [headsUp])

  const [ slideTextSize, setSlideTextSize ] = useState(p.jam.slideTextSize || "text-3xl")
  useEffect(() => {
    console.log("subscribe text size")
    if (p.jam.jamSessionId) { subscribeTextSize(p.jam.jamSessionId) }
  }, [p.jam.slideTextSize, p.jam.jamSessionId])

  const subscribeTextSize = async (jamSessionId: string) => {
    const sub = API.graphql<GraphQLSubscription<OnJamSlideConfigChangeSubscription>>(
      graphqlOperation(s.onJamSlideConfigChange, { jamSessionId } )
    ).subscribe({
      next: ({ value }) => {
        const ts = value.data?.onJamSlideConfigChange?.textSize
        console.log(ts)
        setSlideTextSize(ts || "text-3xl")
      },
      error: (error) => console.error(error)
    })
    console.log(sub)
  }

  useEffect(() => {
    if (p.jam.jamSessionId) { 
      subscribeNextPage(p.jam.jamSessionId)
      subscribeNextSong(p.jam.jamSessionId)
      subscribeKeyChange(p.jam.jamSessionId)
    }
  }, [page, p.jam.jamSessionId])

  const subscribeNextPage = async (jamSessionId: string) => {
    const sub = API.graphql<GraphQLSubscription<OnNextPageSubscription>>(
      graphqlOperation(s.onNextPage, { jamSessionId } )
    ).subscribe({
      next: ({ value }) => {
        const page = value.data?.onNextPage?.page
        incomingNextPage(page || 0)
      },
      error: (error) => console.error(error)
    })
    console.log(sub)
  }

  const subscribeNextSong = async (jamSessionId: string) => {
    const sub = API.graphql<GraphQLSubscription<OnNextSongSubscription>>(
      graphqlOperation(s.onNextSong, { jamSessionId } )
    ).subscribe({
      next: ({provider, value}) => {
        const song = value.data?.onNextSong?.song
        const page = value.data?.onNextSong?.page

        if (!song) { console.log(`No song index value found, this can be OK. ${song}`) }
        if (!page) { console.log(`No page value found, this can be OK. ${page}`) }

        incomingNextSong(song||0, page||0)
      },
      error: (error) => console.error(error)
    })
    console.log(sub)
  }

  const subscribeKeyChange = async (jamSessionId: string) => {
    const sub = API.graphql<GraphQLSubscription<OnSongKeySubscription>>(
      graphqlOperation(s.onSongKey, { jamSessionId } )
    ).subscribe({
      next: ({provider, value}) => {
        console.log("=== On Key Change ===")
        console.log(JSON.stringify(provider))
        console.log(JSON.stringify(value))

        const song = value.data?.onSongKey?.song
        const key = value.data?.onSongKey?.key

        if (!song) { console.log(`No song index value found, this can be OK. ${song}`) }
        if (!key) { console.log(`No page value found, this can be OK. ${page}`) }

        incomingKey(song||0, key || "C")
      },
      error: (error) => console.error(error)
    })
    console.log(sub)
  }
  
  const incomingNextPage = async (page: number) => { setPage(page) }
  const incomingNextSong = async (song: number, page: number) => { 
    setSong(song); setPage(page) 
    setKey(p.jam.setList.songs[song]?.key || "C")
  }
  const incomingKey = async (s: number, key: string) => {
    if (song === s) { setSKey(key) } 
    else { console.error("TODO: handle case where we are modifying NOT current song's key.") }
  }
  
  const setNextPage = async (page: number) => {
    const d = await API.graphql(graphqlOperation(m.nextPage, {
      jamSessionId: p.jam.jamSessionId, page
    })) as GraphQLResult<{ nextPage: NextPage }>
    console.log(d)
  }

  const setNextSong = async (song: number) => {
    if (p.jam.setList.songs.length > song) {
      const d = await API.graphql(graphqlOperation(m.nextSong, {
        jamSessionId: p.jam.jamSessionId, song
      })) as GraphQLResult<{ nextPage: NextPage }>
      console.log(d)
    } else { console.error(`Error: next song index "${song}" is greater than setlist.length "${p.jam.setList.songs.length}"`) }
  }

  const setKey = async (key: string) => {
    const d = await API.graphql(graphqlOperation(m.setSongKey, {
      jamSessionId: p.jam.jamSessionId, song, key
    })) as GraphQLResult<{ setSongKey: NextKey }>
    console.log(d)
  }

  const setJamConfig = async (textSize: string) => {
    const d = await API.graphql(graphqlOperation(m.setJamSlideConfig, {
      jamSessionId: p.jam.jamSessionId, textSize
    })) as GraphQLResult<{ setJamSlideConfig: JamSessionSlideConfig }>
    console.log(d)
  }
  
  useEffect(() => {
    if (!p.jam || p.jam.currentSong! <= -1 || p.jam.currentSong! >= p.jam.setList.songs.length) { 
      console.warn(`currentSong not within range of setList: ${p.jam.currentPage}`); return 
    }
    const cp = p.jam.currentSong!
    if (!p.jam || p.jam.currentPage! <= -1) { 
      console.warn(`currentPage not > 1. ${p.jam.currentPage}`); return 
    }

    if (!p.jam.setList.songs[cp]) { console.error(`song in setlist at ${cp} not found`); return }
    setSong(cp)
    setSKey(p.jam.setList.songs[cp]!.key)
    setPage(p.jam.currentPage || 0)
    console.log("all set")
  }, [p.jam])

  const openFullScreen = () => {
    let el = document.getElementById("player") as any

    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) { /* Safari */
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) { /* IE11 */
      el.msRequestFullscreen();
    } else {
      console.log("could not open full screen ...")
    }
    setOpenSidebar(false)
  }

  const closeFullScreen = () => {
    try {
      if (document.fullscreenElement != null) // document not active issue
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen()
        }
    } catch (e) { console.warn("unalbe to exit full screen.") }
  }

  useEffect(() => {
    if (fullScreen) openFullScreen()
    else closeFullScreen()
  }, [fullScreen])

  const onFullScreenChange = (event: any) => { 
    if (document.fullscreenElement) setFullScreen(true)
    else setFullScreen(false)
  }
  useEffect(() => {
    addEventListener("fullscreenchange", onFullScreenChange)
    return () => removeEventListener("fullscreenchange", onFullScreenChange)
  }, [])

  return <div className={`text-white w-full h-screen flex flex-col overflow-hidden ${theme.theme || "light"}`} id="player">
    { p.jam.setList.songs[song]?.song && 
      (p.isSlideShow ? 
        <SSlides
          song={p.jam.setList.songs[song]!.song} page={page} 
          setPage={setNextPage} setLastPage={setLastPage}
          textSize={slideTextSize || "text-3xl"}
        />:
        <PSlides 
          song={p.jam.setList.songs[song]!.song} skey={sKey} page={page} 
          setPage={setNextPage} setLastPage={setLastPage} transpose={transpose} 
          textSize={textSize} complex={complex} headsUp={headsUp}
        />)
    }
    { !p.isSlideShow && isLastPage && p.jam.setList.songs.length > song+1 && <button onClick={() => setNextSong(song+1)}
        className='fixed bottom-4 right-10 bg-oslyn-600 dark:bg-gray-700 rounded-full p-4 drop-shadow-lg flex justify-center items-center text-4xl hover:bg-coral-300'
      >
        <ChevronDoubleRightIcon className="w-6 h-6 text-white" />
    </button> }
    { p.jam.setList.songs && !p.isSlideShow &&
      <Controls 
        capo={{ capo:`${0-transpose}`, setCapo }} 
        song={{ song, setSong: setNextSong, songs: p.jam.setList.songs as JamSong[] }} 
        sKey={{ skey: sKey, setKey }}
        display={{ textSize, setTextSize, 
          auto: false, setAuto: () => {}, 
          complex, setComplex,
          fullScreen, setFullScreen,
          headsUp, setHeadsUp
        }}
        slides={{
          textSize: slideTextSize,
          setTextSize: setJamConfig
        }}
      /> 
    }
    { isFullScreenEnabled && p.isSlideShow && !fullScreen && <button onClick={() => setFullScreen(true)}
      className={`fixed z-90 right-10 top-4 bg-coral-400 w-12 h-12 rounded-lg p-2 drop-shadow-lg flex justify-center items-center text-4xl hover:bg-coral-300 hover:drop-shadow-2xl`}
    >
      <ArrowsPointingOutIcon className="w-8 h-8 text-oslyn-800 hover:text-oslyn-900" />
    </button>}
  </div>
}