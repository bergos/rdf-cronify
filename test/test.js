/* global describe it */

const assert = require('assert')
const Cronify = require('..')
const rdf = require('rdf-ext')

describe('rdf-cronify', function () {
  it('should should be a constructor', function () {
    const instance = new Cronify()

    assert(instance instanceof Cronify)
  })

  it('should implement the static interface', function () {
    assert.equal(typeof Cronify.addTimestamp, 'function')
    assert.equal(typeof Cronify.createCronifiedIri, 'function')
    assert.equal(typeof Cronify.createTimestampLiteral, 'function')
    assert.equal(typeof Cronify.store, 'function')
  })

  describe('addTimestamp', function () {
    it('should not touch the graph if it contains already a timestamp', function () {
      const subject = rdf.namedNode('http://example.org/subject')

      const graph = rdf.dataset([
        rdf.quad(
          subject,
          rdf.namedNode('http://purl.org/dc/elements/1.1/date'),
          rdf.literal((new Date()).toISOString(), null, rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
        )
      ])

      const timestampGraph = Cronify.addTimestamp(graph.clone(), subject)

      assert(graph.equals(timestampGraph))
    })

    it('should not touch the graph if it contains already a custom timestamp', function () {
      const localCronify = new Cronify({
        timestampPredicate: rdf.namedNode('http://example.org/timestamp')
      })

      const subject = rdf.namedNode('http://example.org/subject')

      const graph = rdf.dataset([
        rdf.quad(
          subject,
          rdf.namedNode('http://example.org/timestamp'),
          rdf.literal((new Date()).toISOString(), null, rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
        )
      ])

      const timestampGraph = localCronify.addTimestamp(graph.clone(), subject)

      assert(graph.equals(timestampGraph))
    })

    it('should add a timestamp with the default predicate', function () {
      const subject = rdf.namedNode('http://example.org/subject')

      const graph = rdf.dataset()

      const timestampGraph = Cronify.addTimestamp(graph.clone(), subject)

      assert.equal(timestampGraph.match(subject, rdf.namedNode('http://purl.org/dc/elements/1.1/date')).length, 1)
    })

    it('should add a timestamp with a custom predicate', function () {
      const localCronify = new Cronify({
        timestampPredicate: rdf.namedNode('http://example.org/timestamp')
      })

      const subject = rdf.namedNode('http://example.org/subject')

      const graph = rdf.dataset()

      const timestampGraph = localCronify.addTimestamp(graph.clone(), subject)

      assert.equal(timestampGraph.match(subject, rdf.namedNode('http://example.org/timestamp')).length, 1)
    })

    it('should add a timestamp with the current date', function () {
      const subject = rdf.namedNode('http://example.org/subject')

      const graph = rdf.dataset()

      const timestampGraph = Cronify.addTimestamp(graph.clone(), subject)

      const timestamp = new Date(timestampGraph.match(subject, rdf.namedNode('http://purl.org/dc/elements/1.1/date')).toArray().shift().object.value)

      assert((new Date()).valueOf() - timestamp.valueOf() < 1000)
    })

    it('should add a timestamp with the given date', function () {
      const subject = rdf.namedNode('http://example.org/subject')
      const date = new Date('2000-01-01T00:00:00Z')

      const graph = rdf.dataset()

      const timestampGraph = Cronify.addTimestamp(graph.clone(), subject, date)

      const quad = timestampGraph.match(subject, rdf.namedNode('http://purl.org/dc/elements/1.1/date')).toArray().shift()

      assert.equal(quad.object.value, date.toISOString())
    })
  })

  describe('createCronifiedIri', function () {
    it('should create an IRI based on the container IRI and the given date', function () {
      const iri = Cronify.createCronifiedIri('http://example.org/container/', new Date('2000-01-01T00:00:00.000Z'))

      assert.equal(iri.toString(), 'http://example.org/container/20000101T000000000Z')
    })
  })

  describe('createTimestampLiteral', function () {
    it('should create a literal based on the given timestamp', function () {
      const timestampLiteral = Cronify.createTimestampLiteral(new Date('2000-01-01T00:00:00.000Z'))

      assert.equal(timestampLiteral.value, '2000-01-01T00:00:00.000Z')
      assert.equal(timestampLiteral.datatype.value, 'http://www.w3.org/2001/XMLSchema#dateTime')
    })

    it('should create a literal based on the current date', function () {
      const timestampLiteral = Cronify.createTimestampLiteral()

      const timestamp = new Date(timestampLiteral.value)

      assert((new Date()).valueOf() - timestamp.valueOf() < 1000)
      assert.equal(timestampLiteral.datatype.toString(), 'http://www.w3.org/2001/XMLSchema#dateTime')
    })
  })

  describe('store', function () {
    it('should store the cronified graph and link to it in the container', function () {
      const container = rdf.namedNode('http://example.org/container/')

      const subject = rdf.namedNode('http://example.org/subject')

      const cronifiedGraph = rdf.dataset([
        rdf.quad(
          subject,
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object')
        )
      ])

      const timestamp = new Date('2000-01-01T00:00:00.000Z')

      Cronify.addTimestamp(cronifiedGraph, subject, timestamp)

      const containerGraph = rdf.dataset([
        rdf.quad(
          container,
          rdf.namedNode('http://www.w3.org/ns/hydra/core#member'),
          Cronify.createCronifiedIri(container, timestamp)
        )
      ])

      const store = {
        add: function (iri, graph) {
          assert(cronifiedGraph.equals(graph))
        },
        merge: function (iri, graph) {
          assert(containerGraph.equals(graph))
        }
      }

      return Cronify.store(store, subject, container, cronifiedGraph)
    })

    it('should store the cronified graph and link to it in the container with a custom container predicate', function () {
      const containerPredicate = rdf.namedNode('http://example.org/member')

      const localCronify = new Cronify({
        containerPredicate: containerPredicate
      })

      const container = rdf.namedNode('http://example.org/container/')

      const subject = rdf.namedNode('http://example.org/subject')

      const cronifiedGraph = rdf.dataset([
        rdf.quad(
          subject,
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object')
        )
      ])

      const timestamp = new Date('2000-01-01T00:00:00.000Z')

      localCronify.addTimestamp(cronifiedGraph, subject, timestamp)

      const containerGraph = rdf.dataset([
        rdf.quad(
          container,
          containerPredicate,
          localCronify.createCronifiedIri(container, timestamp)
        )
      ])

      const store = {
        add: function (iri, graph) {
          assert(cronifiedGraph.equals(graph))
        },
        merge: function (iri, graph) {
          assert(containerGraph.equals(graph))
        }
      }

      return localCronify.store(store, subject, container, cronifiedGraph)
    })
  })
})
