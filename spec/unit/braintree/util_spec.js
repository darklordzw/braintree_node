require('../../spec_helper');
var Util = require('../../../lib/braintree/util').Util;

vows.describe('Util').addBatch({
  'convertObjectKeysToUnderscores': {
    'object with camel case keys': {
      topic: Util.convertObjectKeysToUnderscores({
        topLevel: {
          nestedOne: {
            nestedTwo: 'aValue'
          }
        }
      }),
      'is converted to underscores': function (result) {
        assert.equal(result.top_level.nested_one.nested_two, 'aValue');
      }
    },

    'objects containing date values': {
      topic: Util.convertObjectKeysToUnderscores({
        someDate: new Date()
      }),
      'does not affect the date': function (result) {
        assert.instanceOf(result.some_date, Date);
      }
    },

    'object with an array with objects with camel case keys': {
      topic: Util.convertObjectKeysToUnderscores({
        topLevel: {
          things: [
            { camelOne: 'value1', camelTwo: 'value2' },
            { camelOne: 'value3', camelTwo: 'value4' }
          ]
        }
      }),
      'converts array items to underscores': function (result) {
        assert.isArray(result.top_level.things);
        assert.equal(result.top_level.things[0].camel_one, 'value1');
        assert.equal(result.top_level.things[0].camel_two, 'value2');
        assert.equal(result.top_level.things[1].camel_one, 'value3');
        assert.equal(result.top_level.things[1].camel_two, 'value4');
      }
    }
  },

  'convertNodeToObject': {
    'single value': {
      topic: Util.convertNodeToObject('foobar'),
      'is converted to an object': function (result) {
        assert.equal(result, 'foobar');
      }
    },

    'hash of values': {
      topic: Util.convertNodeToObject({'foo-bar': 'baz', 'ping': 'pong'}),
      'is converted to an object': function (result) {
        assert.deepEqual(result, {'fooBar': 'baz', 'ping': 'pong'});
      }
    },

    'hash of hash of values': {
      topic: Util.convertNodeToObject({'foo-bar': 'baz', 'hash': {'ping-pong': 'paddle'}}),
      'is converted to an object': function (result) {
        assert.deepEqual(result, {'fooBar': 'baz', 'hash': {'pingPong': 'paddle'}});
      }
    },

    'array as object with no items': {
      topic: Util.convertNodeToObject({'@':{'type': 'array'}}),
      'is converted to an object': function (result) {
        assert.deepEqual(result, []);
      }
    },

    'array as object with one item': {
      topic: Util.convertNodeToObject({'@':{'type': 'array'}, 'item': {'foo': 'bar'}}),
      'is converted to an object': function (result) {
        assert.deepEqual(result, [{'foo': 'bar'}]);
      }
    },

    'array as object with multiple items': {
      topic: Util.convertNodeToObject({'@':{'type': 'array'}, 'item':[{'prop': 'value'}, {'prop': 'value'}]}),
      'is converted to an object': function (result) {
        assert.deepEqual(result, [{'prop': 'value'}, {'prop': 'value'}]);
      }
    },

    'array as object with root element': {
      topic: Util.convertNodeToObject({'items':{'@':{'type': 'array'}, 'item':[{'prop': 'value'}, {'prop': 'value'}]}}),
      'is converted to an object': function (result) {
        assert.deepEqual(result, {'items':[{'prop': 'value'}, {'prop': 'value'}]});
      }
    },

    'nil object': {
      topic: Util.convertNodeToObject({'@': {nil: 'true'}}),
      'is converted to null': function (result) {
        assert.isNull(result);
      }
    },

    'symbol': {
      topic: Util.convertNodeToObject({attribute: { '#': 'country_name', '@': { type: 'symbol' } } }),
      'is converted to string': function (result) {
        assert.deepEqual(result, {'attribute': 'country_name'})
      }
    },

    'integer': {
      topic: Util.convertNodeToObject({attribute: { '#': '1234', '@': { type: 'integer' } } }),
      'is converted to integer': function (result) {
        assert.deepEqual(result, {'attribute': 1234})
      }
    },

    'boolean': {
      topic: Util.convertNodeToObject({'a1': { '#': 'true', '@': { type: 'boolean' } }, 'a2': { '#': 'false', '@': { type: 'boolean' } } }),
      'is converted to boolean': function (result) {
        assert.isTrue(result.a1)
        assert.isFalse(result.a2)
      }
    },

    'empty object': {
      topic: Util.convertNodeToObject({attribute: {}}),
      'is converted to empty string': function (result) {
        assert.deepEqual(result, {'attribute': ''});
      }
    }
  },

  'objectIsEmpty': {
    'empty object': {
      topic: Util.objectIsEmpty({}),
      'returns true': function(result) {
        assert.equal(result, true);
      }
    },

    'non-empty object': {
      topic: Util.objectIsEmpty({ key : 'value' }),
      'returns false': function(result) {
        assert.equal(result, false);
      }
    }
  },

  'arrayIsEmpty': {
    'empty array': {
      topic: Util.arrayIsEmpty([]),
      'returns true': function(result) {
        assert.equal(result, true);
      }
    },

    'non-empty array': {
      topic: Util.arrayIsEmpty([1, 2, 3]),
      'returns false': function(result) {
        assert.equal(result, false);
      }
    },

    'not an array': {
      topic: Util.arrayIsEmpty({}),
      'return false': function(result) {
        assert.equal(result, false);
      }
    }
  },

  'flatten': {
    topic: Util.flatten([[1], [2, [3, [4, [5, [6, [7, [8, [9]]]]]]]]]),
    'returns flattened array': function(result) {
      assert.deepEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    },

    topic: Util.flatten([[1, 2], [3, 4], [5], [6, [7, [8, [9]]]]]),
    'returns flattened array': function(result) {
      assert.deepEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    },

    topic: Util.flatten([[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]),
    'returns flattened array': function(result) {
      assert.deepEqual(result, [1]);
    },
  },

  'toCamelCase': {
    'string with underscores': {
      topic: Util.toCamelCase('one_two_three'),
      'is converted to camel case': function (result) {
        assert.equal(result, 'oneTwoThree');
      }
    },

    'string with hyphens': {
      topic: Util.toCamelCase('one-two-three'),
      'is converted to camel case': function (result) {
        assert.equal(result, 'oneTwoThree');
      }
    },
    'string with hyphen followed by a number': {
      topic: Util.toCamelCase('last-4'),
      'removes the hyphen': function (result) {
        assert.equal(result, 'last4');
      }
    }
  },

  'toUnderscore': {
    'string that is camel case': {
      topic: Util.toUnderscore('oneTwoThree'),
      'is converted to underscores': function (result) {
        assert.equal(result, 'one_two_three');
      }
    },
  }
}).export(module);

