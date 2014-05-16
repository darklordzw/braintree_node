require('../../spec_helper')
_ = require('underscore')._
braintree = specHelper.braintree
util = require('util')
{Config} = require('../../../lib/braintree/config')

describe "PaymentMethodGateway", ->
  describe "create", ->
    customerId = null

    context 'with a credit card payment method nonce', ->
      it 'creates a credit card from the nonce', (done) ->
        specHelper.defaultGateway.customer.create {firstName: 'John', lastName: 'Smith'}, (err, response) ->
          customerId = response.customer.id

          specHelper.defaultGateway.clientToken.generate {}, (err, result) ->
            clientToken = JSON.parse(result.clientToken)
            authorizationFingerprint = clientToken.authorizationFingerprint

            params =
              authorizationFingerprint: authorizationFingerprint
              creditCard:
                number: '4111111111111111'
                expirationDate: '01/2020'

            myHttp = new specHelper.clientApiHttp(new Config(specHelper.defaultConfig))
            myHttp.post "/client_api/v1/payment_methods/credit_cards.json", params, (statusCode, body) ->
              nonce = JSON.parse(body).creditCards[0].nonce

              creditCardParams =
                customerId: customerId
                paymentMethodNonce: nonce

              specHelper.defaultGateway.paymentMethod.create creditCardParams, (err, response) ->
                assert.isNull(err)
                assert.isTrue(response.success)
                assert.equal(response.creditCard.maskedNumber, '411111******1111')

                done()

    context 'with a paypal account payment method nonce', ->
      before (done) ->
        specHelper.paypalMerchantGateway.customer.create {firstName: 'John', lastName: 'Smith'}, (err, response) ->
          customerId = response.customer.id
          done()

      it "creates a paypal account from a payment method nonce", (done) ->
        specHelper.paypalMerchantGateway.clientToken.generate {}, (err, result) ->
          clientToken = JSON.parse(result.clientToken)
          authorizationFingerprint = clientToken.authorizationFingerprint

          params =
            authorizationFingerprint: authorizationFingerprint
            paypalAccount:
              consentCode: 'PAYPAL_CONSENT_CODE'

          myHttp = new specHelper.clientApiHttp(new Config(specHelper.paypalMerchantConfig))
          myHttp.post "/client_api/v1/payment_methods/paypal_accounts.json", params, (statusCode, body) ->
            nonce = JSON.parse(body).paypalAccounts[0].nonce
            paypalAccountParams =
              customerId: customerId
              paymentMethodNonce: nonce

            specHelper.paypalMerchantGateway.paymentMethod.create paypalAccountParams, (err, response) ->
              assert.isNull(err)
              assert.isTrue(response.success)
              assert.isNotNull(response.paypalAccount.email)

              done()

      it "returns an error when trying to create a paypal account only authorized for one-time use", (done) ->
        specHelper.paypalMerchantGateway.clientToken.generate {}, (err, result) ->
          clientToken = JSON.parse(result.clientToken)
          authorizationFingerprint = clientToken.authorizationFingerprint

          params = {
            authorizationFingerprint: authorizationFingerprint,
            paypalAccount: {
              accessToken: 'PAYPAL_ACCESS_TOKEN'
            }
          }

          myHttp = new specHelper.clientApiHttp(new Config(specHelper.paypalMerchantConfig))
          myHttp.post "/client_api/v1/payment_methods/paypal_accounts.json", params, (statusCode, body) ->
            nonce = JSON.parse(body).paypalAccounts[0].nonce
            paypalAccountParams =
              customerId: customerId
              paymentMethodNonce: nonce

            specHelper.paypalMerchantGateway.paymentMethod.create paypalAccountParams, (err, response) ->
              assert.isNull(err)
              assert.isFalse(response.success)
              assert.equal(
                response.errors.for('paypalAccount').on('base')[0].code,
                '82902'
              )

              done()

      it "handles errors", (done) ->
        specHelper.paypalMerchantGateway.clientToken.generate {}, (err, result) ->
          clientToken = JSON.parse(result.clientToken)
          authorizationFingerprint = clientToken.authorizationFingerprint

          params = {
            authorizationFingerprint: authorizationFingerprint,
            paypalAccount: {}
          }

          myHttp = new specHelper.clientApiHttp(new Config(specHelper.paypalMerchantConfig))
          myHttp.post "/client_api/v1/payment_methods/paypal_accounts.json", params, (statusCode, body) ->
            nonce = JSON.parse(body).paypalAccounts[0].nonce
            paypalAccountParams =
              customerId: customerId
              paymentMethodNonce: nonce

            specHelper.paypalMerchantGateway.paymentMethod.create paypalAccountParams, (err, response) ->
              assert.isFalse(response.success)
              assert.equal(response.errors.for('paypalAccount').on('base')[0].code, '82902')

              done()

  describe "find", ->
    context 'credit card', ->
      paymentMethodToken = null

      before (done) ->
        specHelper.defaultGateway.customer.create {firstName: 'John', lastName: 'Smith'}, (err, response) ->
          customerId = response.customer.id
          paymentMethodToken = specHelper.randomId()

          specHelper.defaultGateway.clientToken.generate {}, (err, result) ->
            clientToken = JSON.parse(result.clientToken)
            authorizationFingerprint = clientToken.authorizationFingerprint
            params =
              authorizationFingerprint: authorizationFingerprint
              creditCard:
                token: paymentMethodToken
                number: '4111111111111111'
                expirationDate: '01/2020'

            myHttp = new specHelper.clientApiHttp(new Config(specHelper.defaultConfig))
            myHttp.post "/client_api/v1/payment_methods/credit_cards.json", params, (statusCode, body) ->
              nonce = JSON.parse(body).creditCards[0].nonce
              paymentMethodParams =
                customerId: customerId
                paymentMethodNonce: nonce
              specHelper.defaultGateway.paymentMethod.create paymentMethodParams, (err, creditCard) ->
                done()

      it 'finds the card', (done) ->
        specHelper.defaultGateway.paymentMethod.find paymentMethodToken, (err, creditCard) ->
          assert.isNull(err)
          assert.equal(creditCard.maskedNumber, '411111******1111')

          done()

    context 'paypal account', ->
      it "finds the paypal account", (done) ->
        specHelper.paypalMerchantGateway.paymentMethod.find 'PAYPAL_ACCOUNT', (err, paypalAccount) ->
          assert.isNull(err)
          assert.isNotNull(paypalAccount.email)

          done()

    it "handles not finding the paypal account", (done) ->
      specHelper.defaultGateway.paymentMethod.find 'NON_EXISTENT_TOKEN', (err, paypalAccount) ->
        assert.equal(err.type, braintree.errorTypes.notFoundError)

        done()

    it "handles whitespace", (done) ->
      specHelper.defaultGateway.paymentMethod.find ' ', (err, paypalAccount) ->
        assert.equal(err.type, braintree.errorTypes.notFoundError)

        done()

  describe "delete", (done) ->
    it "deletes the paypal account", (done) ->
      specHelper.paypalMerchantGateway.customer.create {firstName: 'John', lastName: 'Smith'}, (err, response) ->
        customerId = response.customer.id

        myHttp = new specHelper.clientApiHttp(new Config(specHelper.paypalMerchantConfig))
        specHelper.paypalMerchantGateway.clientToken.generate({}, (err, result) ->
          clientToken = JSON.parse(result.clientToken)
          authorizationFingerprint = clientToken.authorizationFingerprint

          params = {
            authorizationFingerprint: authorizationFingerprint,
            paypalAccount: {
              consentCode: 'PAYPAL_CONSENT_CODE'
            }
          }

          myHttp.post("/client_api/v1/payment_methods/paypal_accounts.json", params, (statusCode, body) ->
            nonce = JSON.parse(body).paypalAccounts[0].nonce
            paypalAccountParams =
              customerId: customerId
              paymentMethodNonce: nonce

            specHelper.paypalMerchantGateway.paymentMethod.create paypalAccountParams, (err, response) ->
              paymentMethodToken = response.paypalAccount.token

              specHelper.paypalMerchantGateway.paymentMethod.delete paymentMethodToken, (err) ->
                assert.isNull(err)

                specHelper.paypalMerchantGateway.paypalAccount.find paymentMethodToken, (err, response) ->
                  assert.equal(err.type, braintree.errorTypes.notFoundError)
                  done()
          )
        )

    it "handles invalid tokens", (done) ->
      specHelper.paypalMerchantGateway.paymentMethod.delete 'NONEXISTENT_TOKEN', (err) ->
        assert.equal(err.type, braintree.errorTypes.notFoundError)

        done()

