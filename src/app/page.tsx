'use client'

import { useEffect } from 'react'
import { readSave, useGame } from '@/lib/game/store'
import TitleScreen from '@/components/game/TitleScreen'
import GameView from '@/components/game/GameView'

export default function Home() {
  const screen = useGame((s) => s.screen)

  useEffect(() => {
    useGame.getState().setHasSave(!!readSave())
  }, [])

  return screen === 'game' ? <GameView /> : <TitleScreen />
}
