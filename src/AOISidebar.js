import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CalendarIcon,
  ChevronLeftIcon,
  UserCircleIcon
} from '@heroicons/react/outline'
import moment from 'moment'
import pointsWithinPolygon from '@turf/points-within-polygon'
import { renderToString } from 'react-dom/server'
// eslint-disable-next-line
import mapboxgl from '!mapbox-gl'

import RollupChart from './RollupChart'
import Link from './Link'
import PopupSidebar from './PopupSidebar'
import Spinner from './Spinner'

import getRollupCategory from './util/getRollupCategory'
import dummyGeojson from './util/dummyGeojson'

export const categoryColors = [
  'match',
  ['get', 'rollupCategory'],
  'Noise & Nuisance', '#fbb4ae',
  'Streets & Sidewalks', '#b3cde3',
  'Sanitation & Cleanliness', '#ccebc5',
  'Business/Consumer', '#decbe4',
  'Housing & Buildings', '#fed9a6',
  'Homeless/Assistance', '#fddaec',
  'Vehicular/Parking', '#e5d8bd',
  /* other */ 'gray'
]

const AOISidebar = ({
  map,
  allGeometries
}) => {
  const history = useNavigate()
  const [areaOfInterest, setAreaOfInterest] = useState()
  const [serviceRequests, setServiceRequests] = useState()
  const [popupData, setPopupData] = useState()
  const [startDateMoment] = useState(moment().subtract(7, 'd').startOf('day'))

  const { areaOfInterestId } = useParams()

  const highlightedFeature = popupData && popupData[0]

  const handleMapClick = (e) => {
    const { features } = e
    setPopupData(features)
  }

  // initialize sources and layers
  useEffect(() => {
    if (!map) return

    // check for one source in the group
    if (!map.getSource('area-of-interest')) {
      map.addSource('area-of-interest', {
        type: 'geojson',
        data: dummyGeojson
      })

      map.addSource('serviceRequests', {
        type: 'geojson',
        data: dummyGeojson
      })

      map.addSource('highlighted-circle', {
        type: 'geojson',
        data: dummyGeojson
      })

      map.addLayer({
        id: 'area-of-interest-line',
        type: 'line',
        source: 'area-of-interest',
        paint: {
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      })

      map.addLayer({
        id: 'serviceRequests-circle',
        type: 'circle',
        source: 'serviceRequests',
        paint: {
          'circle-color': categoryColors,
          'circle-radius': 3,
          'circle-stroke-color': 'black',
          'circle-stroke-width': 2
        },
        filter: ['>=', ['get', 'created_date'], startDateMoment.unix()]
      })

      map.addLayer({
        id: 'highlighted-circle',
        type: 'circle',
        source: 'highlighted-circle',
        paint: {
          'circle-radius': 30,
          'circle-color': 'lightblue',
          'circle-opacity': 0.6
        },
        filter: ['>=', ['get', 'created_date'], startDateMoment.unix()]
      }, 'serviceRequests-circle')
    }

    return () => {
      map.getSource('area-of-interest').setData(dummyGeojson)
      map.getSource('serviceRequests').setData(dummyGeojson)
      map.getSource('highlighted-circle').setData(dummyGeojson)
    }
  }, [map])

  useEffect(() => {
    if (map && allGeometries) {
      const fetchData = async (bounds) => { // get datestamp for 7 days ago (go one day earlier so we can do a date > clause)
        const dateFrom = startDateMoment.format('YYYY-MM-DD')
        const serviceRequestsApiUrl = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$where=latitude>${bounds[1]} AND latitude<${bounds[3]} AND longitude>${bounds[0]} AND longitude<${bounds[2]} AND (created_date>'${dateFrom}' OR status='Open')&$order=created_date DESC`
        return await fetch(serviceRequestsApiUrl).then(d => d.json())
      }

      const areaOfInterest = allGeometries.features.find((d) => d.properties._id === areaOfInterestId)

      setAreaOfInterest(areaOfInterest)

      const areaOfInterestGeometry = areaOfInterest.geometry
      fetchData(areaOfInterest.properties.bbox)
        .then((data) => {
          // convert to geojson
          const serviceRequestsGeojson = {
            type: 'FeatureCollection',
            features: data.map((d) => {
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [parseFloat(d.longitude), parseFloat(d.latitude)]
                },
                properties: { ...d }
              }
            })
          }

          const clippedServiceRequests = pointsWithinPolygon(serviceRequestsGeojson, areaOfInterestGeometry)
          // convert create_date to unix epoch
          clippedServiceRequests.features = clippedServiceRequests.features.map((d) => {
            return {
              ...d,
              properties: {
                ...d.properties,
                created_date: moment(d.properties.created_date).unix(),
                closed_date: moment(d.properties.closed_date).unix(),
                resolution_action_updated_date: moment(d.properties.resolution_action_updated_date).unix(),
                rollupCategory: getRollupCategory(d.properties.complaint_type)
              }
            }
          })
          setServiceRequests(clippedServiceRequests)
        })
    }
  }, [map, allGeometries])

  useEffect(() => {
    if (map && areaOfInterest) {
      map.getSource('area-of-interest').setData(areaOfInterest)

      map.fitBounds(areaOfInterest.properties.bbox, {
        padding: { top: 30, bottom: 30, left: 400, right: 30 }
      })
    }
  }, [map, areaOfInterest])

  useEffect(() => {
    if (map && serviceRequests) {
      map.getSource('serviceRequests').setData(serviceRequests)

      const tooltip = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
      })

      const showTooltip = (e) => {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer'

        const coordinates = e.features[0].geometry.coordinates.slice()
        const tooltipHtml = (
          <div className='px-2 py-1'>
            {e.features.map((feature) => (
              <div key={feature.properties.unique_key}>
                <span className='text-sm'>{feature.properties.complaint_type} - </span><span className='text-xs text-gray-600'>{moment.unix(feature.properties.created_date).fromNow()}</span>
              </div>
            ))}
          </div>
        )

        tooltip.setLngLat(coordinates).setHTML(renderToString(tooltipHtml)).addTo(map)
      }

      const hideTooltip = () => {
        map.getCanvas().style.cursor = ''
        tooltip.remove()
      }
      map.on('mouseenter', 'serviceRequests-circle', showTooltip)
      map.on('click', 'serviceRequests-circle', handleMapClick)

      map.on('mouseleave', 'serviceRequests-circle', hideTooltip)
    }
  }, [map, serviceRequests])

  useEffect(() => {
    if (!map) return
    map.getSource('highlighted-circle').setData(highlightedFeature || dummyGeojson)
  }, [map, highlightedFeature])

  let newServiceRequests = []
  let oldServiceRequests = []

  // TODO: prep data elsewhere
  if (serviceRequests) {
    newServiceRequests = serviceRequests.features.filter((d) => {
      return d.properties.created_date >= startDateMoment.unix()
    })

    oldServiceRequests = serviceRequests.features.filter((d) => {
      return d.properties.created_date < startDateMoment.unix()
    })
  }

  const handleBackClick = () => {
    history('/')
  }

  if (popupData) {
    return (
      <PopupSidebar complaints={popupData} onClose={() => { setPopupData(null) }} />
    )
  }
  return (
    <>
      {areaOfInterest && (
        <div className='flex flex-col h-full'>
          <div className='px-4 mb-3'>
            <div className='mb-1'>
              <Link onClick={handleBackClick}>
                <div className='flex items-center'><ChevronLeftIcon className='h-5 mr-0.5 -ml-1 inline' /><div className='inline text-sm'>City View</div></div>
              </Link>
            </div>
            <div className='font-semibold text-3xl mb-1'>{areaOfInterest.properties.name}</div>
            <div className='flex items-center justify-end text-gray-600'>
              <span className='font-light text-xs'>by</span> <UserCircleIcon className='h-4 w-4 ml-1 mr-0.5' />
              <div className='text-sm'>{areaOfInterest.properties.owner?.username || 'Anonymous'}</div>
            </div>
          </div>
          <div className='flex-grow overflow-y-scroll px-4'>

            {serviceRequests && (
              <>
                <div className='flex items-center mb-2'>
                  <CalendarIcon className='h-4 w-4 text-indigo-600 mr-2' />
                  <div className='text-sm'>Last 7 days <span className='text-xs'>({startDateMoment.format('D MMM YYYY')} to yesterday)</span></div>
                </div>
                <div className='flex items-center'>
                  <div className='font-bold text-2xl mr-2'>
                    {newServiceRequests.length}
                  </div>
                  <div className='flex-grow text-lg'>
                    New Service Requests
                  </div>
                </div>
                <div className='h-64 mb-3'>
                  <RollupChart data={newServiceRequests} />
                </div>
                <div className='text-xs mb-3'>Hover over the markers for more info, <span className='italic'>click for full details</span>.</div>
                <hr />
                <div className='text-xs mt-3'>This area of interest also has <span className='font-bold'>{oldServiceRequests.length}</span> prior service requests that are still open.</div>
              </>
            )}

            {!serviceRequests && (
              <Spinner>Loading 311 data...</Spinner>
            )}
          </div>
        </div>
      )}
    </>
  )
}

AOISidebar.propTypes = {
  map: PropTypes.object,
  allGeometries: PropTypes.object
}

export default AOISidebar
