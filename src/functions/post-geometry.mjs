// inserts a geometry into the database, returning its unique id
import shortid from 'shortid'
import slugify from 'slugify'

import getDatabaseClient from './getDatabaseClient'
import { requireAuth, handleOptionsCall } from './auth'
import { fireSlackWebhook } from './notify.mjs'

const slugFromName = (string) => {
  return slugify(string, {
    replacement: '-',
    lower: true
  })
}

const queryDatabase = async (body, client) => {
  const db = client.db('nyc-311-digest')
  const id = shortid.generate()

  // reject if no username exists for this user
  const { username } = await db.collection('users').findOne({
    sub: body.owner
  })

  if (!username) {
    return { statusCode: 400, body: `username not found for ${body.owner}` }
  }

  await db.collection('custom-geometries')
    .insertOne({
      _id: id,
      name: body.name,
      geometry: body.geometry,
      bbox: body.bbox,
      owner: body.owner,
      created_at: new Date()
    })

  await fireSlackWebhook(`${username} added a new area of interest named ${body.name}. https://nyc311.app/report/${id}/${slugFromName(body.name)}`)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // Allow from anywhere
    },
    body: JSON.stringify({
      id
    })
  }
}

exports.handler = handleOptionsCall(requireAuth(async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  context.callbackWaitsForEmptyEventLoop = false
  const client = await getDatabaseClient()
  const body = JSON.parse(event.body)

  // check that body.owner === identitycontext.claims.sub
  if (body.owner !== context.identityContext.claims.sub) {
    return { statusCode: 400, body: 'invalid request' }
  }

  return queryDatabase(body, client)
}))
