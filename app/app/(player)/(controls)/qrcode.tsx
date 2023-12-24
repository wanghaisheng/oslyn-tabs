import React from 'react'

import QRCode from 'react-native-qrcode-svg'
import { useTheme } from "next-themes"
import { useEffect, useState } from 'react'

import {Text, View, Image, Pressable, Dimensions, ScrollView } from 'react-native'
import { CheckBox } from '@rneui/themed'

const host = `https://tabs.oslyn.io`

interface QrCodeProps {
  jamSessionId: string
}

export default function QrCode(p: QrCodeProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const [ addLogin, setAddLogin ] = useState(true)

  return <>
    <ScrollView className="ml-3 text-sm font-normal max-w-sm">
      <Text className="pb-2 text-xl font-semibold text-gray-900 dark:text-white">QR Code</Text>
      <Text className="pb-3 text-sm font-normal">Quickly share this jam sessions with your friends!</Text> 

      <View className="flex flex-row mt-10 mb-5">
        <View className="h-24">
          <CheckBox
            checked={addLogin}
            onPress={() => { setAddLogin(!addLogin) }}
            iconType="material-community"
            checkedIcon="checkbox-outline"
            uncheckedIcon={'checkbox-blank-outline'}
          />
        </View>
        <Pressable className="ml-2 text-sm" onPress={() => { setAddLogin(!addLogin) }}>
          <Text className="font-medium text-gray-900 dark:text-gray-300">Add Login</Text>
          <Text className="text-xs font-normal text-gray-500 dark:text-gray-300">This will prompt users to login right away, minimizing &quot;guests&quot;. This feature only applies to Jam.</Text>
        </Pressable>
      </View>

      <View className="max-h-[calc(100vh-20rem)] pl-2 pr-6">
        {mounted && <View className='mx-auto w-[170px] flex flex-row'>
        <Text className="mt-16 mr-6 text-lg font-normal text-gray-900 dark:text-gray-50">Slides</Text>
          <QRCode value={`${host}/jam/${p.jamSessionId}/slides`}
              backgroundColor={ theme === "dark" ? "#1f2937" : "#FFFFFF" }
              color={ theme === "dark" ? "#FFFFFF" : "#1f2937" }
          />
        </View>}

        <View className="my-2 h-px border-t-0 bg-transparent bg-gradient-to-r from-transparent via-oslyn-900 to-transparent opacity-25 dark:opacity-100" />

        {mounted && <View className='mx-auto w-[170px] flex flex-row-reverse'>
          <Text className="mt-16 ml-4 px-2 text-lg font-normal text-gray-900 dark:text-gray-50">Jam</Text> 
            <QRCode value={`${host}/jam/${p.jamSessionId}${addLogin&&"?login=true"}`}
                backgroundColor={ theme === "dark" ? "#1f2937" : "#FFFFFF" }
                color={ theme === "dark" ? "#FFFFFF" : "#1f2937" }
            />
        </View>}
      </View>
      
    </ScrollView>
  </>
}