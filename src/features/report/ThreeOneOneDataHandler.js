import React, { useState, useEffect, createContext } from 'react'
import PropTypes from 'prop-types'
import { useNavigate, useLocation } from 'react-router-dom'
import moment from 'moment'
import pointsWithinPolygon from '@turf/points-within-polygon'

import { DEFAULT_DATE_RANGE_SELECTION, dateSelectionItems } from './DateRangeSelector'
import { useGetServiceRequestsQuery } from '../../util/service-requests-api'
import getRollupCategory from '../../util/categoryColors'

// use query params
function useQuery () {
  const { search } = useLocation()

  return React.useMemo(() => new URLSearchParams(search), [search])
}

export const ThreeOneOneDataContext = createContext()

const ThreeOneOneDataHandler = ({
  areaOfInterest,
  children
}) => {
  const [skip, setSkip] = useState(true)
  // raw service requests, appended via pagination
  const [serviceRequests, setServiceRequests] = useState([])
  // FeatureCollection of combined service requests
  const [serviceRequestsFC, setServiceRequestsFC] = useState()
  const [page, setPage] = useState(1)
  const [popupData, setPopupData] = useState()

  const query = useQuery()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // array of two moments
  const dateRangeSelectorFromQueryParams = dateSelectionItems.find((d) => {
    return d.value === query.get('dateSelection')
  }) || DEFAULT_DATE_RANGE_SELECTION

  const [dateSelection, setDateSelection] = useState(dateRangeSelectorFromQueryParams)

  const bbox = areaOfInterest.properties.bbox

  const { data } = useGetServiceRequestsQuery({
    bbox,
    dateSelection,
    page
  }, {
    skip
  })

  // react to changes in query params
  useEffect(() => {
    setDateSelection(dateRangeSelectorFromQueryParams)
  }, [dateRangeSelectorFromQueryParams])

  // kicks off the querying when the date range changes
  useEffect(() => {
    if (areaOfInterest) {
      setServiceRequests([])
      setSkip(false)
    }
  }, [areaOfInterest, dateSelection.dateRange])

  // when data selection changes, update the query params
  const handleDateSelectionChange = (d) => {
    navigate({
      pathname,
      search: `?dateSelection=${d.value}`,
      hash: window.location.hash // get this value directly from window because mapboxgl is updating the hash
    })
  }

  // check results length, keep fetching data until the number of results is less than 1000
  useEffect(() => {
    if (data?.length) {
      setServiceRequests([...serviceRequests, ...data])
      if (data.length < 1000) {
        setSkip(true)
      } else {
        setPage(page + 1)
      }
    }
  }, [data])

  // when all pages are downloaded, convert to geojson FeatureCollection for export
  useEffect(() => {
    if (serviceRequests.length && skip) {
      // convert to geojson
      const serviceRequestsGeojson = {
        type: 'FeatureCollection',
        features: serviceRequests.map((d) => {
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

      const clippedServiceRequests = pointsWithinPolygon(serviceRequestsGeojson, areaOfInterest.geometry)
      // convert created_date to unix epoch
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

      setServiceRequestsFC(clippedServiceRequests)
    }
  }, [serviceRequests])

  return (
    <ThreeOneOneDataContext.Provider value={{
      serviceRequestsFC,
      dateSelection,
      handleDateSelectionChange,
      popupData,
      setPopupData
    }}
    >
      {children}
    </ThreeOneOneDataContext.Provider>
  )
}

ThreeOneOneDataHandler.propTypes = {
  areaOfInterest: PropTypes.object,
  children: PropTypes.array
}

export default ThreeOneOneDataHandler
