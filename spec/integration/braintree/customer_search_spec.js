'use strict';

require('../../spec_helper');
let Config = require('../../../lib/braintree/config').Config;

describe("CustomerSearch", () =>
  describe("search", function() {
    let lastName = null;

    before(function(done) {
      lastName = specHelper.randomId();
      return specHelper.defaultGateway.customer.create({firstName: 'Bob', lastName}, (err, response) =>
        specHelper.defaultGateway.customer.create({firstName: 'Ryan', lastName}, (err, response) => done())
      );
    });

    it("can return no results", done =>
      specHelper.defaultGateway.customer.search((search => search.email().is(specHelper.randomId() + "@example.com")), function(err, response) {
        assert.isNull(err);
        assert.equal(response.length(), 0);

        return done();
      })
    );

    it("can return a single result", function(done) {
      let search = function(search) {
        search.firstName().is("Bob");
        return search.lastName().is(lastName);
      };

      return specHelper.defaultGateway.customer.search(search, (err, response) =>
        response.first(function(err, customer) {
          assert.equal(customer.firstName, 'Bob');
          assert.equal(customer.lastName, lastName);

          return done();
        })
      );
    });

    it("allows stream style interation of results", function(done) {
      let search = specHelper.defaultGateway.customer.search(search => search.lastName().is(lastName));

      let customers = [];

      search.on('data', customer => customers.push(customer));

      search.on('end', function() {
        assert.equal(customers.length, 2);
        assert.equal(customers[0].lastName, lastName);
        assert.equal(customers[1].lastName, lastName);

        return done();
      });

      return search.resume();
    });

    it("can return multiple results", done =>
      specHelper.defaultGateway.customer.search((search => search.lastName().is(lastName)), function(err, response) {
        let customers = [];
        return response.each(function(err, customer) {
          customers.push(customer);

          if (customers.length === 2) {
            assert.equal(customers.length, 2);
            assert.equal(customers[0].lastName, lastName);
            assert.equal(customers[1].lastName, lastName);

            return done();
          }
        });
      })
    );

    it("can search on payment method token with duplicates", function(done) {
      let joe = {
        firstName: "Joe",
        creditCard: {
          number: "5105105105105100",
          expirationDate: "05/2012"
        }
      };

      return specHelper.defaultGateway.customer.create(joe, function(err, response) {
        let token = response.customer.creditCards[0].token;
        let joeId = response.customer.id;

        let jim = {
          firstName: "Jim",
          creditCard: {
            number: "5105105105105100",
            expirationDate: "05/2012"
          }
        };

        return specHelper.defaultGateway.customer.create(jim, function(err, response) {
          let jimId = response.customer.id;

          let search = function(search) {
            search.paymentMethodTokenWithDuplicates().is(token);
            return search.ids().in([joeId, jimId]);
          };

          return specHelper.defaultGateway.customer.search(search, function(err, response) {
            let customers = [];

            return response.each(function(err, customer) {
              customers.push(customer);

              if (customers.length === 2) {
                assert.equal(customers.length, 2);
                assert.equal(customers[0].firstName, "Jim");
                assert.equal(customers[1].firstName, "Joe");

                return done();
              }
            });
          });
        });
      });
    });

    it("handles complex searches", function(done) {
      let id = specHelper.randomId();
      let email = `${specHelper.randomId()}@example.com`;
      let firstName = `John_${specHelper.randomId()}`;
      lastName = `Smith_${specHelper.randomId()}`;
      let cardToken = `card_${specHelper.randomId()}`;

      let customerParams = {
        company: "Braintree",
        email,
        fax: "(123)456-7890",
        firstName,
        id,
        lastName,
        phone: "(456)123-7890",
        website: "http://www.example.com/",
        creditCard: {
          number: "5105105105105100",
          expirationDate: "05/2012",
          cardholderName: `${firstName} ${lastName}`,
          token: cardToken,
          billingAddress: {
            firstName,
            lastName,
            streetAddress: "123 Fake St",
            extendedAddress: "Suite 403",
            locality: "Chicago",
            region: "IL",
            postalCode: "60607",
            countryName: "United States of America"
          }
        }
      };

      return specHelper.defaultGateway.customer.create(customerParams, function(err, response) {
        let textCriteria = {
          addressCountryName: "United States of America",
          addressExtendedAddress: "Suite 403",
          addressFirstName: firstName,
          addressLastName: lastName,
          addressLocality: "Chicago",
          addressPostalCode: "60607",
          addressStreetAddress: "123 Fake St",
          cardholderName: `${firstName} ${lastName}`,
          company: "Braintree",
          email,
          fax: "(123)456-7890",
          firstName,
          id,
          lastName,
          paymentMethodToken: cardToken,
          phone: "(456)123-7890",
          website: "http://www.example.com/"
        };

        let equalityCriteria =
          {creditCardExpirationDate: "05/2012"};

        let partialCriteria = {
          creditCardNumber: {
            startsWith: "5105",
            endsWith: "100"
          }
        };

        let multipleValueCriteria =
          {ids: customerParams.id};

        let today = new Date();
        let yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        let tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);

        let rangeCriteria = {
          createdAt: {
            min: yesterday,
            max: tomorrow
          }
        };

        let search = function(search) {
          let operator, value;
          for (var criteria in textCriteria) {
            value = textCriteria[criteria];
            search[criteria]().is(value);
          }

          for (criteria in equalityCriteria) {
            value = equalityCriteria[criteria];
            search[criteria]().is(value);
          }

          for (criteria in partialCriteria) {
            let partial = partialCriteria[criteria];
            for (operator in partial) {
              value = partial[operator];
              search[criteria]()[operator](value);
            }
          }

          for (criteria in multipleValueCriteria) {
            value = multipleValueCriteria[criteria];
            search[criteria]().is(value);
          }

          return (() => {
            let result = [];
            for (criteria in rangeCriteria) {
              var range = rangeCriteria[criteria];
              result.push((() => {
                let result1 = [];
                for (operator in range) {
                  value = range[operator];
                  result1.push(search[criteria]()[operator](value));
                }
                return result1;
              })());
            }
            return result;
          })();
        };

        return specHelper.defaultGateway.customer.search(search, function(err, response) {
          assert.isTrue(response.success);
          assert.equal(response.length(), 1);

          return response.first(function(err, customer) {
            assert.isObject(customer);
            assert.equal(customer.id, customerParams.id);
            assert.isNull(err);

            return done();
          });
        });
      });
    });

    return it("searches on customer's paypal account by email", function(done) {
      let customerId = `CUSTOMER_${specHelper.randomId()}`;
      let firstName = `John_${specHelper.randomId()}`;
      lastName = `Smith_${specHelper.randomId()}`;
      let paymentMethodToken = `PAYPAL_ACCOUNT_${specHelper.randomId()}`;

      let customerParams = {
        id: customerId,
        firstName,
        lastName
      };

      return specHelper.defaultGateway.customer.create(customerParams, function(err, response) {

        let myHttp = new specHelper.clientApiHttp(new Config(specHelper.defaultConfig));
        return specHelper.defaultGateway.clientToken.generate({}, function(err, result) {
          let clientToken = JSON.parse(specHelper.decodeClientToken(result.clientToken));
          let authorizationFingerprint = clientToken.authorizationFingerprint;

          let params = {
            authorizationFingerprint,
            paypalAccount: {
              consentCode: 'PAYPAL_CONSENT_CODE',
              token: paymentMethodToken
            }
          };

          return myHttp.post("/client_api/v1/payment_methods/paypal_accounts.json", params, function(statusCode, body) {
            let nonce = JSON.parse(body).paypalAccounts[0].nonce;
            let paypalAccountParams = {
              customerId,
              paymentMethodNonce: nonce
            };

            return specHelper.defaultGateway.paymentMethod.create(paypalAccountParams, function(err, response) {

              let search = function(searchResult) {
                searchResult.paypalAccountEmail().is(response.paymentMethod.email);
                return searchResult.id().is(customerId);
              };

              return specHelper.defaultGateway.customer.search(search, function(err, response) {
                assert.isTrue(response.success);
                assert.equal(response.length(), 1);

                return response.first(function(err, customer) {
                  assert.isObject(customer);
                  assert.equal(customer.paypalAccounts[0].token, paymentMethodToken);
                  assert.isNull(err);

                  return done();
                });
              });
            });
          });
        });
      });
    });
  })
);
