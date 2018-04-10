const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.resetDatabaseForNewRound = functions.https.onRequest((request, response) => {
  return admin.database().ref().once('value').then(snapshot => {
    // Get the entire database and the number of regions
    const db = snapshot.val();
    const numRegions = Object.keys(db.regions).length;

    // Construct a 2d array to store the users
    let usersGroupedByRegion = []
    for (let i = 0; i < numRegions; i++) {
      usersGroupedByRegion[i] = [];
    }

    // Fill the usersGroupedByRegion array with the users.
    // Each element of the array corresponds to a region. The elements are just 
    // arrays of user ids.
    Object.keys(db.users).forEach(userKey => {
      let reg = db.users[userKey].currentRegion;
      usersGroupedByRegion[reg].push(userKey);
    });

    // Place users into teams.
    // We keep track of the current team outside of the loop so that the total
    // number of people on each team (for the entire game) is balanced.
    let curTeam = 0;
    let teamsByRegion = []
    for (let r = 0; r < usersGroupedByRegion.length; r++) {
      let userArray = usersGroupedByRegion[r];

      //Shuffle the array of users for this region
      for (let i = userArray.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let x = userArray[i];
        userArray[i] = userArray[j];
        userArray[j] = x;
      }

      //Loop over teams, placing one person in a team at a time
      //This ensures that we don't get team sizes of things like (2, 2, 4) and
      //instead get (2, 3, 3)
      let teamsInThisRegion = [[], [], []];
      for (let curUser = 0; curUser < userArray.length; curUser++) {

        teamsInThisRegion[curTeam].push(userArray[curUser]);
        snapshot.ref.child("users/" + userArray[curUser] + "/currentTeam").set(curTeam);

        curTeam = (curTeam + 1) % 3;
      }
      teamsByRegion.push(teamsInThisRegion);
    }

    // Update the teams object in the database
    snapshot.ref.child('teams').set(teamsByRegion);

    // Clear out the messages and invitations objects
    snapshot.ref.child('messages').set({});
    snapshot.ref.child('groupinvitations').set({});

    // Reset all regions
    for (let r = 0; r < db.regions.length; r++) {
      data = db.regions[r].colorData;
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[0].length; j++) {
          data[i][j] = -1;
        }
      }
      snapshot.ref.child('regions').child(r).child("colorData").set(data);
    }

    return response.send("If you can see this then the code completed executing.");
  });
});
