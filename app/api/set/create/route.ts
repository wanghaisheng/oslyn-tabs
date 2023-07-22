import { NextResponse } from 'next/server'

import { Amplify, API, graphqlOperation } from 'aws-amplify'
import { GraphQLResult } from "@aws-amplify/api"
import awsConfig from '@/src/aws-exports'

import * as m from '@/src/graphql/mutations'
import { JamSongInput, SetList } from '@/src/API'

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Session } from "next-auth"

// TODO Remove
//const _generalUserId = "3d7fbd91-14fa-41da-935f-704ef74d7488"

export interface SetRequest {
  description: string,
  songs: JamSongInput[]
}

type _Session = Session & {
  userId: string
}

export async function POST(request: Request) {
  console.log(`${request.method} ${request.url}`)
  const b = await request.json() as SetRequest

  const session = await getServerSession(authOptions)
  if (!(session?.user as _Session)?.userId) { return NextResponse.json({ error: 'Unauthorized'}, { status: 401 }) }
  const userId = (session?.user as _Session)?.userId

  Amplify.configure(awsConfig)
  console.log(JSON.stringify(b))

  const d = await API.graphql(graphqlOperation(
    m.createSet, { ...b, userId: userId }
  )) as GraphQLResult<{ createSet: SetList }>

  if (!d.data?.createSet) {
    console.error(`createSet data is empty: ${JSON.stringify(d.data)}`)
    return NextResponse.json({ error: 'Internal Server Error'}, { status: 500 })
  }

  console.log(`${request.method} ${request.url} .. complete`)
  return NextResponse.json(d.data.createSet)
}
