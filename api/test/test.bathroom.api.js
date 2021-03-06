var should = require('should'); 
var assert = require('assert');
var request = require('supertest');
var mongoose = require('mongoose');

var User = require('../models/user');
var Bathroom = require('../models/bathroom');
var secrets = require('./../config/secrets');

var api = 'http://localhost:3000';

describe('Bathroom', function() {

    var user = {
        email: 'test1@test.com',
        password: 'password'
    };

    var user2 = {
        email: 'test2@test.com',
        password: 'password'
    };

    var bathroom = {
        "lat": 123.45,
        "lng": -12.43,
        "bathroom_name": "Test 1",
        "bathroom_access": 0,
        "gender": 0,
        "voteDir": 1
    }

    var invalid_bathroom = {
        "lat": 123.45,
        "name": "Test 1",
        "bathroom_access": 0,
        "gender": 0,
        "voteDir": 1
    }

    before(function(done) {
        mongoose.connect(secrets.db);
        Bathroom.remove({}, function(err) {
            User.remove(done);
        });
    });

    afterEach(function(done) {
        Bathroom.remove({}, function(err) {
            User.remove(done);
        });
    });

    after(function(done) {
        mongoose.connection.close();
        done();
    });

    describe('Add bathroom', function(done) {

        it('should succeed with 200 status.', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(bathroom)
                        .set('access', access)
                        .end(function(err, res) {
                            res.should.have.status(200);
                            res.body.should.have.property('response', 'ok');
                            done();
                        });
                });
        });

        it('should fail because of missing fields and invalid values.', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(invalid_bathroom)
                        .set('access', access)
                        .end(function(err, res) {
                            res.should.have.status(400);
                            res.body.should.have.property('response', 'fail');
                            done();
                        });
                });
        });

        it('should fail because user signs out.', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .get('/signout')
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            request(api)
                                .post('/addbathroom')
                                .send(bathroom)
                                .end(function(er, re) {
                                    re.should.have.status(401);
                                    re.body.should.have.property('response', 'fail');
                                    done();
                                });
                        });
                });
        });

    });

    describe('Get bathroom', function(done) {

        it('should succeed with 200 status.', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(bathroom)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .get('/getbathroom/'+r.body.bathroom._id)
                                .set('access', access)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    r2.body.bathroom.should.have.property('_id', r.body.bathroom._id);
                                    done();
                                });
                        });
                });
        });

    });

    describe('Add vote', function(done) {

        it('should add a vote by user2', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(bathroom)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/signup/')
                                .send(user2)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    var access = res.body.user.token;
                                    request(api)
                                        .post('/addvote')
                                        .send({'bid': r.body.bathroom._id, 'voteDir': 1})
                                        .set('access', access)
                                        .end(function(e3, r3) {
                                            r3.should.have.status(200);
                                            r3.body.user.voted_bathrooms.should.include(r.body.bathroom._id);
                                            done();
                                        });
                                });
                        });
                });
        });

        it('should throw a 400 error because of invalis vote', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(bathroom)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/signup/')
                                .send(user2)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    var access = res.body.user.token;
                                    request(api)
                                        .post('/addvote')
                                        .send({'bid': r.body.bathroom._id, 'voteDir': 2})
                                        .set('access', access)
                                        .end(function(e3, r3) {
                                            r3.should.have.status(400);
                                            r3.body.should.have.property('response', 'fail');
                                            done();
                                        });
                                });
                        });
                });
        });

    });

    describe('Add review', function(done) {

        it('should add a review for the current user', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(bathroom)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/addreview')
                                .send({'bid': r.body.bathroom._id, 'cleanliness': 4, 'review': 'this was awesome'})
                                .set('access', access)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    r2.body.bathroom.reviews.should.have.length(1);
                                    done();
                                });
                        });
                });
        });
    });

    describe('Get reviews', function(done) {

        it('should add and get exactly one review', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(bathroom)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/addreview')
                                .send({'bid': r.body.bathroom._id, 'cleanliness': 4, 'review': 'this was awesome'})
                                .set('access', access)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    r2.body.bathroom.reviews.should.have.length(1);
                                    request(api)
                                        .get('/getreviews/'+r.body.bathroom._id)
                                        .set('access', access)
                                        .end(function(e3, r3) {
                                            r3.should.have.status(200);
                                            r3.body.bathroom.reviews.should.have.length(1);
                                            r3.body.bathroom.reviews[0].left_by.should.include(res.body.user._id);
                                            done();
                                        });
                                });
                        });
                });
        });

    });

    describe('Get all bathrooms near', function(done) {

        var b1 = {
            "lat": 47.654395, "lng": -122.309332,
            "bathroom_name": "Test 1",
            "bathroom_access": 0, "gender": 0, "voteDir": 1
        };

        var b2 = {
            "lat": 47.654372, "lng": -122.308452,
            "bathroom_name": "Test 2",
            "bathroom_access": 0, "gender": 0, "voteDir": 1
        };

        var b3 = { // too far from everything else
            "lat": 47.654806, "lng": -122.31504,
            "bathroom_name": "Test 3",
            "bathroom_access": 0, "gender": 0, "voteDir": 1
        };

        it('should return a list of 2 bathrooms', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(b1)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/addbathroom')
                                .send(b2)
                                .set('access', access)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    request(api)
                                        .post('/addbathroom')
                                        .send(b3)
                                        .set('access', access)
                                        .end(function(e3, r3) {
                                            r3.should.have.status(200);
                                            request(api)
                                                .get('/getallnear/47.654184,-122.306306')
                                                .set('access', access)
                                                .end(function(e4, r4) {
                                                    r4.should.have.status(200);
                                                    r4.body.bathrooms.should.have.length(2);
                                                    done();
                                                });
                                        });
                                });
                        });
                });
        });

        it('should return a list of 1 bathroom', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(b1)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/addbathroom')
                                .send(b2)
                                .set('access', access)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    request(api)
                                        .post('/addbathroom')
                                        .send(b3)
                                        .set('access', access)
                                        .end(function(e3, r3) {
                                            r3.should.have.status(200);
                                            request(api)
                                                .get('/getallnear/47.655341,-122.318602')
                                                .set('access', access)
                                                .end(function(e4, r4) {
                                                    r4.should.have.status(200);
                                                    r4.body.bathrooms.should.have.length(1);
                                                    done();
                                                });
                                        });
                                });
                        });
                });
        });

        it('should give status 400 because of invalid coordinates', function(done) {
            request(api)
                .post('/signup')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(200);
                    var access = res.body.user.token;
                    request(api)
                        .post('/addbathroom')
                        .send(b1)
                        .set('access', access)
                        .end(function(e, r) {
                            r.should.have.status(200);
                            r.body.should.have.property('response', 'ok');
                            request(api)
                                .post('/addbathroom')
                                .send(b2)
                                .set('access', access)
                                .end(function(e2, r2) {
                                    r2.should.have.status(200);
                                    request(api)
                                        .post('/addbathroom')
                                        .send(b3)
                                        .set('access', access)
                                        .end(function(e3, r3) {
                                            r3.should.have.status(200);
                                            request(api)
                                                .get('/getallnear/47,-abc')
                                                .set('access', access)
                                                .end(function(e4, r4) {
                                                    r4.should.have.status(400);
                                                    done();
                                                });
                                        });
                                });
                        });
                });
        });

    });

});
