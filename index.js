'use strict'

var rdf = require('rdf-ext')

function Cronify (options) {
  options = options || {}

  this.timestampPredicate = options.timestampPredicate || rdf.createNamedNode('http://purl.org/dc/elements/1.1/date')
  this.timestampDatatype = options.timestampDatatype || rdf.createNamedNode('http://www.w3.org/2001/XMLSchema#dateTime')
  this.containerPredicate = options.containerPredicate || rdf.createNamedNode('http://www.w3.org/ns/hydra/core#member')
}

Cronify.prototype.addTimestamp = function (graph, subject, timestamp) {
  if (graph.match(subject, this.timestampPredicate).length === 0) {
    graph.add(rdf.createTriple(subject, this.timestampPredicate, this.createTimestampLiteral(timestamp)))
  }

  return graph
}

Cronify.prototype.createCronifiedIri = function (containerIri, timestamp) {
  timestamp = timestamp.toISOString().split('-').join('').split(':').join('').replace('.', '')

  return rdf.createNamedNode(containerIri.toString() + timestamp)
}

Cronify.prototype.createTimestampLiteral = function (timestamp) {
  timestamp = timestamp || new Date()

  return rdf.createLiteral(timestamp.toISOString(), null, this.timestampDatatype)
}

Cronify.prototype.store = function (store, subject, container, graph) {
  var timestamp = new Date(graph.match(subject, this.timestampPredicate).toArray().shift().object.nominalValue)
  var cronifiedIri = this.createCronifiedIri(container, timestamp)

  var containerGraph = rdf.createGraph()

  containerGraph.add(rdf.createTriple(
    rdf.createNamedNode(container.toString()),
    this.containerPredicate,
    cronifiedIri
  ))

  return Promise.all([
    store.add(cronifiedIri.toString(), graph),
    store.merge(container.toString(), containerGraph)
  ]).then(() => {
    return cronifiedIri
  })
}

// add static methods
Cronify.instance = new Cronify()
Cronify.addTimestamp = Cronify.instance.addTimestamp.bind(Cronify.instance)
Cronify.createCronifiedIri = Cronify.instance.createCronifiedIri.bind(Cronify.instance)
Cronify.createTimestampLiteral = Cronify.instance.createTimestampLiteral.bind(Cronify.instance)
Cronify.store = Cronify.instance.store.bind(Cronify.instance)

module.exports = Cronify
