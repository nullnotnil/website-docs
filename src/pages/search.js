import '../styles/pages/search.scss'

import React, { useEffect, useState } from 'react'
import {
  docsDMVersion,
  docsTiDBOperatorVersion,
  docsTiDBVersion,
  docsCloudVersion,
  tidbStableVersion,
  dmStableVersion,
  operatorStableVersion
} from '../lib/version'
import { getDocInfo, setLoading, setSearchValue, defaultDocInfo } from '../state'
import { useDispatch, useSelector } from 'react-redux'

import { FormattedMessage } from 'react-intl'
import Layout from '../components/layout'
import Loading from '../components/loading'
import SEO from '../components/seo'
import SearchResult from '../components/search/result'
import { algoliaClient } from '../lib/algolia'
import { useLocation } from '@reach/router'

const docsTiDBVersionList = Object.values(docsTiDBVersion)
const docsTiDBOperatorVersionList = Object.values(docsTiDBOperatorVersion)
const docsDMVersionList = Object.values(docsDMVersion)
const docsCloudVersionList = Object.values(docsCloudVersion)

const matchToVersionList = (match) => {
  switch (match) {
    case 'tidb':
      return docsTiDBVersionList
    case 'tidb-in-kubernetes':
      return docsTiDBOperatorVersionList
    case 'tidb-data-migration':
      return docsDMVersionList
    case 'tidbcloud':
      return docsCloudVersionList
    default:
      return docsTiDBVersionList
  }
}

const types = [
  {
    name: 'TiDB',
    match: 'tidb',
    version: docsTiDBVersionList,
  },
  {
    name: 'Tools',
    dropdown: [
      {
        name: 'TiDB in Kubernetes',
        match: 'tidb-in-kubernetes',
        version: docsTiDBOperatorVersionList,
      },
      {
        name: 'TiDB Data Migration (DM)',
        match: 'tidb-data-migration',
        version: docsDMVersionList,
      },
    ],
  },
  {
    name: 'Cloud',
    match: 'tidbcloud',
    version: docsCloudVersionList,
  },
]

const Search = ({ pageContext: { locale } }) => {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const lang = searchParams.get('lang') || defaultDocInfo['lang']
  const type = searchParams.get('type') || defaultDocInfo['type']
  const version = searchParams.get('version') || defaultDocInfo['version']
  const query = searchParams.get('q')

  const dispatch = useDispatch()

  const loading = useSelector((state) => state.loading)

  const [selectedType, setSelectedType] = useState(type)
  const [selectedVersion, setSelectedVersion] = useState(version)
  const [selectedVersionList, setSelectedVersionList] = useState(
    matchToVersionList(type)
  )
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  useEffect(
    () => {
      dispatch(
        getDocInfo({
          lang,
          type,
          version,
        })
      )

      return () => dispatch(setSearchValue(''))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const handleDropdownActive = (e) => {
    e.currentTarget.classList.toggle('is-active')
  }

  const handleSetVersionList = (match, versionList) => () => {
    setSelectedVersion(matchToVersionList(match)[0])
    setSelectedType(match)
    setSelectedVersionList(versionList)
  }

  const handleSetVersionAndExecSearch = (version) => () => {
    const _version = version === 'stable' ? replaceStableVersion() : `${version}`
    setSelectedVersion(_version)
  }

  useEffect(() => {
    if (lang && selectedType && selectedVersion && query) {
      execSearch()
    } else {
      setResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedVersion, query])

  function execSearch() {
    dispatch(setLoading(true))

    const index = algoliaClient.initIndex(
      `website-docs-${lang}-${selectedType}`
    )

    index
      .search(query, {
        hitsPerPage: 300,
        facetFilters: [`version:${selectedVersion === 'stable' ? replaceStableVersion() : `${selectedVersion}`}`],
      })
      .then(({ hits }) => {
        setResults(hits)
        setSearched(true)
        dispatch(setLoading(false))
      })
  }

  const TypeList = () => (
    <div className="type-list">
      {types.map((type) => {
        if (type.dropdown) {
          return (
            <div
              key={type.name}
              role="button"
              tabIndex={0}
              className="dropdown"
              onClick={handleDropdownActive}
              onKeyDown={handleDropdownActive}
            >
              <div className="dropdown-trigger">
                <div
                  className={`item${
                    type.dropdown
                      .map((item) => item.match)
                      .includes(selectedType)
                      ? ' is-active'
                      : ''
                  }`}
                >
                  {type.name}
                </div>
              </div>
              <div className="dropdown-menu">
                <div className="dropdown-content">
                  {type.dropdown.map((item) => (
                    <div
                      key={item.name}
                      role="button"
                      tabIndex={0}
                      className={`dropdown-item${
                        selectedType === item.match ? ' is-active' : ''
                      }`}
                      onClick={handleSetVersionList(item.match, item.version)}
                      onKeyDown={handleSetVersionList(item.match, item.version)}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        } else {
          return (
            <div
              key={type.name}
              role="button"
              tabIndex={0}
              className={`item${
                selectedType === type.match ? ' is-active' : ''
              }`}
              onClick={handleSetVersionList(type.match, type.version)}
              onKeyDown={handleSetVersionList(type.match, type.version)}
            >
              {type.name}
            </div>
          )
        }
      })}
    </div>
  )

  function replaceStableVersion() {
    switch (selectedType) {
      case 'tidb':
        return tidbStableVersion
      case 'tidb-data-migration':
        return dmStableVersion
      case 'tidb-in-kubernetes':
        return operatorStableVersion
      default:
        break
    }
  }

  const VersionList = () => (
    <div className="version-list">
      {selectedVersionList &&
        selectedVersionList.map((version) => (
          <span
            key={version}
            role="button"
            tabIndex={0}
            className={`item${selectedVersion === version ? ' is-active' : ''}`}
            onClick={handleSetVersionAndExecSearch(version)}
            onKeyDown={handleSetVersionAndExecSearch(version)}
          >
            {version === 'stable' ? replaceStableVersion() : `${version}`}
          </span>
        ))}
    </div>
  )

  return (
    <Layout locale={locale} forbidResetDocInfo={true}>
      <SEO title="Search" />
      <article className="PingCAP-Docs-Search">
        <section className="section container">
          <div className="filter-panel">
            <div className="columns">
              <div className="column is-1">
                <span className="label">
                  <FormattedMessage id="search.type" />
                </span>
              </div>
              <div className="column">
                <TypeList />
              </div>
            </div>
            <div className="columns">
              <div className="column is-1">
                <span className="label">
                  <FormattedMessage id="search.version" />
                </span>
              </div>
              <div className="column">
                <VersionList />
              </div>
            </div>
          </div>

          <SearchResult results={results} searched={searched} />

          {loading && <Loading />}
        </section>
      </article>
    </Layout>
  )
}

export default Search
