/**
 * FlowController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


module.exports = {
    callback: async (req, res) => {
        try {
            let input = req.body;
            let userData = {};
            let chatId, firstName, lastName, username, messageId, callbackId, channel, payload, message, longitude, latitude;
            if (req.params.channel == 'facebook') {
                let hubMode = req.query['hub.mode'];
                let hubChallenge = req.query['hub.challenge'];
                let hubVerifyToken = req.query['hub.verify_token'];
                let verifyToken = "bmatch"
                if (hubMode && verifyToken) {
                    if (hubMode === 'subscribe' && verifyToken === hubVerifyToken) {
                        return res.set('Content-Type', 'text/plain').status(200).send(hubChallenge);
                    } else {
                        return res.status(403);
                    }
                }
                if (input.object === 'page') {
                    res.set('Content-Type', 'text/plain').status(200).send('EVENT_RECEIVED');
                }
                chatId = input['entry'][0]['messaging'][0]['sender']['id'];
                const userInfo = await RequestService.fetchFacebookUserDetails(chatId);

                firstName = userInfo['first_name'] ? userInfo['first_name'] : null;
                lastName = userInfo['last_name'] ? userInfo['last_name'] : null;
                username = userInfo['first_name'] && userInfo['last_name'] ? `${userInfo['first_name']}_${userInfo['last_name']}` : null;
                messageId = null;
                callbackId = null;
                channel = 'facebook';
                payload = null;
                message = null;
                longitude = 0.0;
                latitude = 0.0;

                let webhook_event = input['entry'][0]['messaging'][0];
                if (webhook_event['message']) {
                    payload = webhook_event['message']['quick_reply'] ? input['entry'][0]['messaging'][0]['message']['quick_reply']['payload'] : null;
                    message = webhook_event['message']['text'];
                    if (webhook_event['message']['attachments']) {
                        if (webhook_event['message']['attachments'][0]['type'] == 'location') {
                            longitude = webhook_event['message']['attachments'][0]['payload']['coordinates']['long'];
                            latitude = webhook_event['message']['attachments'][0]['payload']['coordinates']['lat'];
                        }
                    }
                } else if (webhook_event['postback']) {
                    message = webhook_event['postback']['title'];
                    payload = webhook_event['postback']['payload'];
                }
            }
            userData['message'] = message;
            userData['payload'] = payload;
            userData['longitude'] = longitude;
            userData['latitude'] = latitude;
            userData['chatId'] = chatId;
            userData['messageId'] = messageId;
            userData['channel'] = channel;
            userData['firstName'] = firstName;
            userData['lastName'] = lastName;
            userData['username'] = username;
            userData['callbackId'] = callbackId;

            await UtilityService.insertUserDetails(userData);
            const user = await User.findOne({ chatId, isDeleted: false });

            userData['nextSession'] = user ? user.nextSession : null;
            userData['donor'] = user ? user.donor : null;
            userData['countryCoordinates'] = user ? user.countryCoordinates : null;
            let botResponse
            if (userData['nextSession'] == 'start') {
                userData['nextSession'] = 'phoneNumber';
                await UtilityService.updateNextSession(userData);
                botResponse = `Welcome ${userData['firstName']}.\nBmatch connects voluntary blood donors to matching recipients at the point of need.`;

                await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                botResponse = `Please enter your phone number (Matched Blood recipients would have access to the number)\ni.e 2348139354422.`;

                return await UtilityService.send(userData, botResponse, null, { facebook: 'contact' })

            } else if (userData['nextSession'] == 'phoneNumber') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['wit$phone_number:phone_number']) {
                    userData['nextSession'] = 'gender';
                    await UtilityService.updateNextSession(userData);

                    userData['phoneNumber'] = queryWit['entities']['wit$phone_number:phone_number'][0]['value'];
                    await UtilityService.updatePhoneNumber(userData);

                    botResponse = `Phone Number Saved`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `What gender would you like to identify with?`;
                    const gender = await UtilityService.genderList();
                    await UtilityService.send(userData, botResponse, gender, { facebook: 'quick_reply' });

                } else {
                    botResponse = `Invalid Phone Number. Input a valid phone number\ni.e 2348139354422`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'contact' })

                }
            } else if (userData['nextSession'] == 'gender') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['gender:gender']) {
                    userData['nextSession'] = 'blood_group';
                    await UtilityService.updateNextSession(userData);

                    userData['gender'] = queryWit['entities']['gender:gender'][0]['value'];
                    await UtilityService.updateGender(userData);

                    botResponse = `Gender '${userData['gender']}' selected.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `What is your blood type/group?`;
                    const bloodGroup = await UtilityService.bloodGroupList();
                    return await UtilityService.send(userData, botResponse, bloodGroup, { facebook: 'quick_reply' });
                } else {
                    botResponse = `Invalid Gender. Input a valid gender\ni.e Male, Female, or Others`;
                    const gender = await UtilityService.genderList();
                    return await UtilityService.send(userData, botResponse, gender, { facebook: 'quick_reply' });
                }
            } else if (userData['nextSession'] == 'blood_group') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['blood_group:blood_group']) {
                    userData['nextSession'] = 'age';
                    await UtilityService.updateNextSession(userData);

                    userData['bloodGroup'] = queryWit['entities']['blood_group:blood_group'][0]['value'];
                    await UtilityService.updateBloodGroup(userData);

                    botResponse = `Blood Group '${userData['bloodGroup']}' selected.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `How old are you?`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                } else {
                    botResponse = `Invalid Blood Group. Input a valid blood group\ni.e O+, O- etc`;
                    const bloodGroup = await UtilityService.bloodGroupList();
                    return await UtilityService.send(userData, botResponse, bloodGroup, { facebook: 'quick_reply' });
                }
            } else if (userData['nextSession'] == 'age') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['wit$age_of_person:age_of_person']) {
                    if (!isNaN(Number(queryWit['entities']['wit$age_of_person:age_of_person'][0]['value']))) {
                        userData['nextSession'] = 'country';
                        await UtilityService.updateNextSession(userData);

                        userData['age'] = queryWit['entities']['wit$age_of_person:age_of_person'][0]['value'];
                        await UtilityService.updateAge(userData);

                        botResponse = `Age '${userData['age']}' saved.`;
                        await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                        botResponse = `What country are you currently in? (This helps us provide a match when the need arises)`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                    } else {
                        botResponse = `Invalid Age. Input a numeric value.\ni.e 20`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    }
                } else {
                    botResponse = `Invalid Age. Input a valid age`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'country') {
                const queryWit = await RequestService.queryWitAi(userData);

                if (queryWit['entities'] && queryWit['entities']['wit$location:location']) {
                    if (queryWit['entities'] && queryWit['entities']['wit$location:location'][0]['type'] == 'resolved') {
                        if (queryWit['entities'] && queryWit['entities']['wit$location:location'][0]['resolved']['values'][0]['domain'] == 'country') {
                            userData['nextSession'] = 'locationQuery';
                            await UtilityService.updateNextSession(userData);

                            userData['country'] = queryWit['entities']['wit$location:location'][0]['resolved']['values'][0];
                            await UtilityService.updateCountry(userData);

                            botResponse = `Country Saved`;
                            await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                            botResponse = `What's your current location? (This helps us provide a match when the need arises)`;
                            return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                        } else {
                            botResponse = `Invalid Country. Input a valid country\ni.e Nigeria`;
                            return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                        }
                    } else {
                        botResponse = `Invalid Country. Input a valid country\ni.e Nigeria`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    }
                } else {
                    botResponse = `Invalid Country. Input a valid country\ni.e Nigeria`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                }
            } else if (userData['nextSession'] == 'locationQuery') {
                if (userData['message']) {
                    userData['nextSession'] = 'locationResult';
                    await UtilityService.updateNextSession(userData);

                    return await UtilityService.queryLocation(userData);
                } else {
                    botResponse = `Invalid Location.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'locationResult') {
                if (userData['payload']) {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    await UtilityService.updateLocation(userData);

                    botResponse = `Location Saved.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `Registration Successful.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `Quickstart (Send 'help' to view my menu):`;
                    const menu = await UtilityService.menu();
                    return await UtilityService.send(userData, botResponse, menu, { facebook: 'quick_reply' });
                } else {
                    userData['nextSession'] = 'locationQuery';
                    await UtilityService.updateNextSession(userData);
                    botResponse = `Invalid Selection.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'donorRegister' || userData['nextSession'] == 'donorUnRegister') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['answer:answer']) {
                    if (queryWit['entities']['answer:answer'][0]['value'] == 'yes' || userData['payload'] == 'yes' || userData['message'].toLowerCase() == 'yes') {
                        userData['donor'] = userData['nextSession'] == 'donorRegister' ? true : false;
                        await UtilityService.updateDonorRegistration(userData);

                        botResponse = userData['nextSession'] == 'donorRegister' ? `Donor Registration was successful.` : `You have successfully opted out from being a donor.`;

                        userData['nextSession'] = 'action';
                        await UtilityService.updateNextSession(userData);
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    } else if (queryWit['entities']['answer:answer'][0]['value'] == 'no' || userData['payload'] == 'no' || userData['message'].toLowerCase() == 'no') {

                        botResponse = userData['nextSession'] == 'donorRegister' ? `Donor Registration Cancelled.` : `Opt out cancelled`;
                        userData['nextSession'] = 'action';
                        await UtilityService.updateNextSession(userData);
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                    } else {
                        botResponse = `Invalid Answer. Input a valid answer\ni.e 'yes' or 'no'`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    }
                } else {
                    botResponse = `Invalid Answer. Input a valid answer\ni.e 'yes' or 'no'`;
                    const answer = await UtilityService.answerList();
                    return await UtilityService.send(userData, botResponse, answer, { facebook: 'quick_reply' });
                }
            } else if (userData['nextSession'] == 'donorRequest') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['answer:answer']) {
                    if (queryWit['entities']['answer:answer'][0]['value'] == 'yes') {
                        userData['nextSession'] = 'donorRequestReason';
                        await UtilityService.updateNextSession(userData);

                        botResponse = `Please enter a request why you're requesting for blood:`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    } else if (queryWit['entities']['answer:answer'][0]['value'] == 'no') {
                        userData['nextSession'] = 'action';
                        await UtilityService.updateNextSession(userData);

                        botResponse = `Donor Request Cancelled.`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                    } else {
                        botResponse = `Invalid Answer. Input a valid answer\ni.e 'yes' or 'no'`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    }
                } else {
                    botResponse = `Invalid Answer. Input a valid answer\ni.e 'yes' or 'no'`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'donorRequestReason') {
                if (userData['message']) {
                    userData['nextSession'] = 'donorRequestBloodGroup';
                    await UtilityService.updateNextSession(userData);

                    await UtilityService.insertDonorRequestReason(userData);

                    botResponse = `What blood type/group do you currently need?`;
                    const bloodGroup = await UtilityService.bloodGroupList();
                    return await UtilityService.send(userData, botResponse, bloodGroup, { facebook: 'quick_reply' });
                } else {
                    botResponse = `Invalid Donor Request Reason. Input a valid reason`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'donorRequestBloodGroup') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['blood_group:blood_group']) {
                    userData['nextSession'] = 'donorRequestCountry';
                    await UtilityService.updateNextSession(userData);

                    userData['bloodGroup'] = queryWit['entities']['blood_group:blood_group'][0]['value'];
                    await UtilityService.insertDonorRequestBloodGroup(userData);

                    botResponse = `Blood Group '${userData['bloodGroup']}' selected.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `What country are you currently in? (This helps us match you to the nearest matching donor in your country.)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                } else {
                    botResponse = `Invalid Blood Group. Input a valid blood group\ni.e O+, O- etc`;
                    const bloodGroup = await UtilityService.bloodGroupList();
                    return await UtilityService.send(userData, botResponse, bloodGroup, { facebook: 'quick_reply' });
                }
            } else if (userData['nextSession'] == 'donorRequestCountry') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (queryWit['entities'] && queryWit['entities']['wit$location:location']) {
                    if (queryWit['entities'] && queryWit['entities']['wit$location:location'][0]['type'] == 'resolved') {
                        if (queryWit['entities'] && queryWit['entities']['wit$location:location'][0]['resolved']['values'][0]['domain'] == 'country') {
                            userData['nextSession'] = 'donorRequestLocationQuery';
                            await UtilityService.updateNextSession(userData);

                            userData['country'] = queryWit['entities']['wit$location:location'][0]['resolved']['values'][0];
                            await UtilityService.insertDonorRequestCountry(userData);

                            botResponse = `What's your current location/hospital? (This helps us match you to the nearest matching donor. We'd prefer you input a known hospital inorder for the donor to easily locate you and also feel secured.)`;
                            return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                        } else {
                            botResponse = `Invalid Country. Input a valid country\ni.e Nigeria`;
                            return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                        }
                    } else {
                        botResponse = `Invalid Country. Input a valid country\ni.e Nigeria`;
                        return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                    }
                } else {
                    botResponse = `Invalid Country. Input a valid country\ni.e Nigeria`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                }
            } else if (userData['nextSession'] == 'donorRequestLocationQuery') {
                if (userData['message']) {
                    userData['nextSession'] = 'donorRequestLocationResult';
                    await UtilityService.updateNextSession(userData);

                    return await UtilityService.queryDonorRequestLocation(userData);
                } else {
                    botResponse = `Invalid Location/hospital.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location/hospital? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'donorRequestLocationResult') {
                if (userData['payload']) {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    await UtilityService.insertDonorRequestLocation(userData);

                    botResponse = `Finding a match...`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `Donor request sent to 5 matching recipient. Your contact details has been to sent to the donor.`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                } else {
                    userData['nextSession'] = 'donorRequestLocationQuery';
                    await UtilityService.updateNextSession(userData);
                    botResponse = `Invalid Selection.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location/hospital? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'bloodDriveLocationQuery') {
                if (userData['message']) {
                    userData['nextSession'] = 'bloodDriveLocationResult';
                    await UtilityService.updateNextSession(userData);

                    return await UtilityService.queryBloodDriveLocation(userData);
                } else {
                    botResponse = `Invalid location.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'bloodDriveLocationResult') {
                if (userData['payload']) {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Finding the closest blood drive...`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `Blood Drives:`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                } else {
                    userData['nextSession'] = 'bloodDriveLocationQuery';
                    await UtilityService.updateNextSession(userData);
                    botResponse = `Invalid Selection.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'bloodBankLocationQuery') {
                if (userData['message']) {
                    userData['nextSession'] = 'bloodBankLocationResult';
                    await UtilityService.updateNextSession(userData);

                    return await UtilityService.queryBloodBankLocation(userData);
                } else {
                    botResponse = `Invalid location.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'bloodBankLocationResult') {
                if (userData['payload']) {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Finding the closest blood banks...`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' })

                    botResponse = `Blood Banks:`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' });
                } else {
                    userData['nextSession'] = 'bloodBankLocationQuery';
                    await UtilityService.updateNextSession(userData);
                    botResponse = `Invalid Selection.`;
                    await UtilityService.send(userData, botResponse, null, { facebook: 'message' });

                    botResponse = `What's your current location? (Input a word or phrase)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else if (userData['nextSession'] == 'action') {
                const queryWit = await RequestService.queryWitAi(userData);
                if (userData['payload'] == 'donor' || userData['message'].toLowerCase() == 'donor') {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Would you like to ${userData['donor'] ? 'unregister' : 'register'} as a donor or request for a donor?`;
                    const donorMenu = await UtilityService.donorMenu(userData);
                    return await UtilityService.send(userData, botResponse, donorMenu, { facebook: 'quick_reply' });
                } else if (queryWit['entities'] && queryWit['entities']['donor_register:donor_register'] || userData['payload'] == 'register' || userData['message'].toLowerCase() == 'register') {
                    userData['nextSession'] = 'donorRegister';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `A donor is an individual who accepts to be connected to a matching blood type recipient in need of blood transfusion. Would you like to continue donor registration?`;
                    const answer = await UtilityService.answerList();
                    return await UtilityService.send(userData, botResponse, answer, { facebook: 'quick_reply' });
                } else if (queryWit['entities'] && queryWit['entities']['donor_unregister:donor_unregister'] || userData['payload'] == 'unregister' || userData['message'].toLowerCase() == 'unregister') {
                    userData['nextSession'] = 'donorUnRegister';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `You would no longer receive donor requests after opting out. Would you like to continue?`;
                    const answer = await UtilityService.answerList();
                    return await UtilityService.send(userData, botResponse, answer, { facebook: 'quick_reply' });
                } else if (queryWit['entities'] && queryWit['entities']['request_donor:request_donor'] || userData['payload'] == 'request' || userData['message'].toLowerCase() == 'request') {
                    userData['nextSession'] = 'donorRequest';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Donor request is the process in which a recipient request for a blood donor and is matched based on location and blood group. Your personal details such as (Name, phone number, gender, blood group) would be sent to the matching blood donor (Update your profile settings by typing /start if you'd like to use a different personal info). Would you like to proceed to request for a blood donor?`;
                    const answer = await UtilityService.answerList();
                    return await UtilityService.send(userData, botResponse, answer, { facebook: 'quick_reply' });
                } else if (userData['payload'] == 'bloodDrive' || userData['message'].toLowerCase() == 'blood drive') {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Would you like to search for a blood drive or organize a blood drive?`;
                    const bloodDriveMenu = await UtilityService.bloodDriveMenu(userData);
                    return await UtilityService.send(userData, botResponse, bloodDriveMenu, { facebook: 'quick_reply' });
                } else if (queryWit['entities'] && queryWit['entities']['blood_drive_search:blood_drive_search'] || userData['payload'] == 'bloodDriveSearch' || userData['message'].toLowerCase() == 'search for a blood drive') {
                    userData['nextSession'] = 'bloodDriveLocationQuery';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Enter your location to search for the nearest blood drive location(s) around you:`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                } else if (queryWit['entities'] && queryWit['entities']['blood_drive_organize:blood_drive_organize'] || userData['payload'] == 'bloodDriveOrganize' || userData['message'].toLowerCase() == 'organize a blood drive') {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `We would like to moderate blood drive creation and possibly sponsor them if we can. Send us an email at bmatchbot@gmail.com to create a blood drive.`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                } else if (userData['payload'] == 'bloodBank' || userData['message'].toLowerCase() == 'blood bank') {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Would you like to search for a blood bank or partner and enlist your blood bank?`;
                    const donorMenu = await UtilityService.bloodBankMenu(userData);
                    return await UtilityService.send(userData, botResponse, donorMenu, { facebook: 'quick_reply' });
                } else if (queryWit['entities'] && queryWit['entities']['blood_bank_search:blood_bank_search'] || userData['payload'] == 'bloodBankSearch' || userData['message'].toLowerCase() == 'search for a blood bank') {
                    userData['nextSession'] = 'bloodBankLocationQuery';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Enter your location to search for the nearest blood bank locations around you:`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                } else if (queryWit['entities'] && queryWit['entities']['blood_bank_partner:blood_bank_partner'] || userData['payload'] == 'bloodBankPartner' || userData['message'].toLowerCase() == 'enlist blood bank') {
                    userData['nextSession'] = 'action';
                    await UtilityService.updateNextSession(userData);

                    botResponse = `Contact us at bmatchbot@gmail.com if you'd like to enlist your blood bank on our platform.`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                } else if (userData['message'].toLowerCase() == 'help') {
                    botResponse = `Quickstart (Send 'help' to view my menu):`;
                    const menu = await UtilityService.menu();
                    return await UtilityService.send(userData, botResponse, menu, { facebook: 'quick_reply' });
                } else {
                    botResponse = `My little witty brain could not comprehend. (Send 'help' to view my menu)`;
                    return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
                }
            } else {
                botResponse = `My little witty brain could not comprehend.`;
                return await UtilityService.send(userData, botResponse, null, { facebook: 'message' })
            }

        } catch (err) {
            return res.serverError(err);
        }
    },
};

