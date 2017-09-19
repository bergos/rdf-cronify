const rdf = require('rdf-ext')

class Cronify {
  constructor (options) {
    options = options || {}

    this.timestampPredicate = options.timestampPredicate || rdf.namedNode('http://purl.org/dc/elements/1.1/date')
    this.timestampDatatype = options.timestampDatatype || rdf.namedNode('http://www.w3.org/2001/XMLSchema#dateTime')
    this.containerPredicate = options.containerPredicate || rdf.namedNode('http://www.w3.org/ns/hydra/core#member')
  }

  addTimestamp (graph, subject, timestamp) {
    if (graph.match(subject, this.timestampPredicate).length === 0) {
      graph.add(rdf.quad(subject, this.timestampPredicate, this.createTimestampLiteral(timestamp)))
    }

    return graph
  }

  createCronifiedIri (containerIri, timestamp) {
    timestamp = timestamp.toISOString().split('-').join('').split(':').join('').replace('.', '')

    return rdf.namedNode(containerIri.toString() + timestamp)
  }

  createTimestampLiteral (timestamp) {
    timestamp = timestamp || new Date()

    return rdf.literal(timestamp.toISOString(), this.timestampDatatype)
  }

  store (store, subject, container, graph) {
    const timestamp = new Date(graph.match(subject, this.timestampPredicate).toArray().shift().object.value)

    const cronifiedIri = this.createCronifiedIri(container, timestamp)
    const cronifiedGraph = rdf.dataset(graph, cronifiedIri)

    const containerGraph = rdf.dataset([
      rdf.quad(
        rdf.namedNode(container.toString()),
        this.containerPredicate,
        cronifiedIri,
        container
      )
    ])

    return Promise.all([
      rdf.waitFor(store.import(cronifiedGraph.toStream())),
      rdf.waitFor(store.import(containerGraph.toStream()))
    ]).then(() => {
      return cronifiedIri
    })
  }
}

// add static methods
Cronify.instance = new Cronify()
Cronify.addTimestamp = Cronify.instance.addTimestamp.bind(Cronify.instance)
Cronify.createCronifiedIri = Cronify.instance.createCronifiedIri.bind(Cronify.instance)
Cronify.createTimestampLiteral = Cronify.instance.createTimestampLiteral.bind(Cronify.instance)
Cronify.store = Cronify.instance.store.bind(Cronify.instance)

module.exports = Cronify
