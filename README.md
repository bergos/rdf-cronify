# rdf-cronify

This module adds timestamps to RDF graphs and pushes them to a store.

# Usage

All methods are available as instance and member methods.

- `addTimestamp(graph, subject, [timestamp])`:
  Adds a timestamp to the graph for the given subject.
  The current time is used if no timestamp is given. 
  Does nothing if there is already a timestamp.
- `createCronifiedIri(containerIri, timestamp)`:
  Creates an IRI based on the container IRI and a clean string of the timestamp.
- `createTimestampLiteral([timestamp])`:
  Creates a literal with a datatype for the given timestamp.
  The current time is used if no timestamp is given.
- `store((store, subject, container, graph))`:
  Adds the graph to the store and creates a link in the container graph to the cronified graph.
  If the graph/subject does not contain a timestamp `addTimestamp` must be called before.

A new instance of Cronify is only required if some properties need to be customized.
The constructor accepts an options object with the following properties:

- `timestampPredicate`: (default: `NamedNode('http://purl.org/dc/elements/1.1/date')`)
- `timestampDatatype`: (default: `NamedNode('http://www.w3.org/2001/XMLSchema#dateTime')`)
- `containerPredicate`: (default: `NamedNode('http://www.w3.org/ns/hydra/core#member')`)
