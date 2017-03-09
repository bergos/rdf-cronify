/* global describe it */

var assert = require('assert')
var Cronify = require('..')
var rdf = require('rdf-ext')

describe('rdf-cronify', function () {
  it('should should be a constructor', function () {
    var instance = new Cronify()

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
      var subject = rdf.createNamedNode('http://example.org/subject')

      var graph = rdf.createGraph([
        rdf.createTriple(
          subject,
          rdf.createNamedNode('http://purl.org/dc/elements/1.1/date'),
          rdf.createLiteral((new Date()).toISOString(), null, rdf.createNamedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
        )
      ])

      var timestampGraph = Cronify.addTimestamp(graph.clone(), subject)

      assert(graph.equals(timestampGraph))
    })

    it('should not touch the graph if it contains already a custom timestamp', function () {
      var localCronify = new Cronify({
        timestampPredicate: rdf.createNamedNode('http://example.org/timestamp')
      })

      var subject = rdf.createNamedNode('http://example.org/subject')

      var graph = rdf.createGraph([
        rdf.createTriple(
          subject,
          rdf.createNamedNode('http://example.org/timestamp'),
          rdf.createLiteral((new Date()).toISOString(), null, rdf.createNamedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
        )
      ])

      var timestampGraph = localCronify.addTimestamp(graph.clone(), subject)

      assert(graph.equals(timestampGraph))
    })

    it('should add a timestamp with the default predicate', function () {
      var subject = rdf.createNamedNode('http://example.org/subject')

      var graph = rdf.createGraph()

      var timestampGraph = Cronify.addTimestamp(graph.clone(), subject)

      assert.equal(timestampGraph.match(subject, rdf.createNamedNode('http://purl.org/dc/elements/1.1/date')).length, 1)
    })

    it('should add a timestamp with a custom predicate', function () {
      var localCronify = new Cronify({
        timestampPredicate: rdf.createNamedNode('http://example.org/timestamp')
      })

      var subject = rdf.createNamedNode('http://example.org/subject')

      var graph = rdf.createGraph()

      var timestampGraph = localCronify.addTimestamp(graph.clone(), subject)

      assert.equal(timestampGraph.match(subject, rdf.createNamedNode('http://example.org/timestamp')).length, 1)
    })

    it('should add a timestamp with the current date', function () {
      var subject = rdf.createNamedNode('http://example.org/subject')

      var graph = rdf.createGraph()

      var timestampGraph = Cronify.addTimestamp(graph.clone(), subject)

      var timestamp = new Date(timestampGraph.match(subject, rdf.createNamedNode('http://purl.org/dc/elements/1.1/date')).toArray().shift().object.nominalValue)

      assert((new Date()).valueOf() - timestamp.valueOf() < 1000)
    })

    it('should add a timestamp with the given date', function () {
      var subject = rdf.createNamedNode('http://example.org/subject')
      var date = new Date('2000-01-01T00:00:00Z')

      var graph = rdf.createGraph()

      var timestampGraph = Cronify.addTimestamp(graph.clone(), subject, date)

      assert.equal(timestampGraph.match(subject, rdf.createNamedNode('http://purl.org/dc/elements/1.1/date'), date.toISOString()).length, 1)
    })
  })

  describe('createCronifiedIri', function () {
    it('should create an IRI based on the container IRI and the given date', function () {
      var iri = Cronify.createCronifiedIri('http://example.org/container/', new Date('2000-01-01T00:00:00.000Z'))

      assert.equal(iri.toString(), 'http://example.org/container/20000101T000000000Z')
    })
  })

  describe('createTimestampLiteral', function () {
    it('should create a literal based on the given timestamp', function () {
      var timestampLiteral = Cronify.createTimestampLiteral(new Date('2000-01-01T00:00:00.000Z'))

      assert.equal(timestampLiteral.nominalValue, '2000-01-01T00:00:00.000Z')
      assert.equal(timestampLiteral.datatype.toString(), 'http://www.w3.org/2001/XMLSchema#dateTime')
    })

    it('should create a literal based on the current date', function () {
      var timestampLiteral = Cronify.createTimestampLiteral()

      var timestamp = new Date(timestampLiteral.nominalValue)

      assert((new Date()).valueOf() - timestamp.valueOf() < 1000)
      assert.equal(timestampLiteral.datatype.toString(), 'http://www.w3.org/2001/XMLSchema#dateTime')
    })
  })

  describe('store', function () {
    it('should store the cronified graph and link to it in the container', function () {
      var container = rdf.createNamedNode('http://example.org/container/')

      var subject = rdf.createNamedNode('http://example.org/subject')

      var cronifiedGraph = rdf.createGraph([
        rdf.createTriple(
          subject,
          rdf.createNamedNode('http://example.org/predicate'),
          rdf.createLiteral('object')
        )
      ])

      var timestamp = new Date('2000-01-01T00:00:00.000Z')

      Cronify.addTimestamp(cronifiedGraph, subject, timestamp)

      var containerGraph = rdf.createGraph([
        rdf.createTriple(
          container,
          rdf.createNamedNode('http://www.w3.org/ns/hydra/core#member'),
          Cronify.createCronifiedIri(container, timestamp)
        )
      ])

      var store = {
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
      var containerPredicate = rdf.createNamedNode('http://example.org/member')

      var localCronify = new Cronify({
        containerPredicate: containerPredicate
      })

      var container = rdf.createNamedNode('http://example.org/container/')

      var subject = rdf.createNamedNode('http://example.org/subject')

      var cronifiedGraph = rdf.createGraph([
        rdf.createTriple(
          subject,
          rdf.createNamedNode('http://example.org/predicate'),
          rdf.createLiteral('object')
        )
      ])

      var timestamp = new Date('2000-01-01T00:00:00.000Z')

      localCronify.addTimestamp(cronifiedGraph, subject, timestamp)

      var containerGraph = rdf.createGraph([
        rdf.createTriple(
          container,
          containerPredicate,
          localCronify.createCronifiedIri(container, timestamp)
        )
      ])

      var store = {
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
