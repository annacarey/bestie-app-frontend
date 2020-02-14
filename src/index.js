window.addEventListener('DOMContentLoaded', (event) => {
    const friendsURL = "http://localhost:3000/friends"
    const usersURL = "http://localhost:3000/users"

    //Sign in functionality
    const signInDiv = document.getElementById("login-signup")
    const signInForm = document.getElementById("signin-form")
    const signUpButton = document.getElementById("signup-btn")

    //Friend array for pagination purposes
    let friendArray = []
    let page = 1
    let friendsList = {}
    let buttonDiv = {}
    let addFriendDiv = {}
    let addFriendToggle = true

    signInDiv.addEventListener("submit", e => {
        e.preventDefault()
        if (e.target == signInForm) {
            const signInDiv = document.getElementById("sign-in")
            if (signInDiv.lastChild === document.getElementById("login-error")) {
                signInDiv.removeChild(signInDiv.lastChild)
            }
            const username = e.target.elements[0].value
            let error = true
            fetch(usersURL)
                .then((response) => {
                    return response.json();
                })
                .then((userObjects) => {
                    userObjects.forEach(userObject => {
                        if (userObject.name === username) {
                            login(userObject)
                            error = false
                        }
                    })
                })
                .then(function(){
                    if (error) {
                        const error = document.createElement("p")
                        error.id = "login-error"
                        error.innerText = "User not found"
                        signInDiv.append(error)
                    }
                })
        } else if (e.target === document.getElementById("signup-form")) {
            const userName = e.target.elements[0].value
            const userEmail = e.target.elements[1].value
            const userPhoneNumber = e.target.elements[2].value
            const userImage = e.target.elements[3].value
            fetch(usersURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(
                    { name: userName, email: userEmail, phone_number: userPhoneNumber, image_url: userImage }
                ),
            })
                .then((response) => response.json())
                .then((userObject) => {
                    if (userObject["errors"]) {
                        document.getElementById("signup-form").remove()
                        renderUserFormAgain(userObject)
                    }
                    else {
                        login(userObject)
                    }
                })
        }
    })
    
    //Sign up functionality
    const signUpForm = document.createElement("div")
    
    signUpButton.addEventListener("click", e => {
        if (document.getElementById("login-error")) {
            document.getElementById("login-error").remove()
        }
        signInForm.style.display = "none"
        document.getElementById("no-account").style.display = "none"
        signInDiv.append(signUpButton)
        signUpButton.style.display = "none"
        signUpForm.id = "signup-div"
        signUpForm.innerHTML = `
            <p>Register your new account below: </p>
            <form id="signup-form">
                <input class="signup-input" type="text" name="name" placeholder="username...">
                <br>
                <input class="signup-input" type="text" name="email" placeholder="email...">
                <br>
                <input class="signup-input" type="text" name="phone-number" placeholder="phone number...">
                <br>
                <input class="signup-input" type="text" name="image-url" placeholder="profile image link...">
                <br>
                <input class="button" class="button" type="submit" value="Sign Up">
            </form>
            <button class="button-link" id="back-to-login-button">Back to Login</button>
        `
        signInDiv.append(signUpForm)
        backToLoginEventAdder()
    })

    function renderUserFormAgain(userObject) {
        let nameError = ""
        let emailError = ""
        let phoneError = ""
        let imageError = ""
        userObject["errors"].forEach(error => {
            switch (error.split(" ")[0]) {
                case 'Name':
                    nameError = error;
                    break;
                case "Email":
                    emailError = error;
                    break;
                case 'Phone':
                    phoneError = error;
                    break
                case 'Image':
                    imageError = error;
                    break
            }
        })
        const anotherUserForm = document.createElement("div")
        anotherUserForm.innerHTML = `
                <form id="signup-form">
                    <input type="text" name="name" placeholder="Username...">
                    ${nameError}
                    <br>
                    <input type="text" name="email" placeholder="Email...">
                    ${emailError}
                    <br>
                    <input type="text" name="phone-number" placeholder="Phone number...">
                    ${phoneError}
                    <br>
                    <input type="text" name="image-url" placeholder="Profile image link...">
                    ${imageError}
                    <br>
                    <input class="button" type="submit" value="Sign Up">
                </form>
                `
        signInDiv.append(anotherUserForm)
    }


    const dashboardDiv = document.getElementById("dashboard")

    // Once a user submits their name, find them in the database
    function login(userObject) {
        let noFriends = false;
        fetch(friendsURL)
            .then((response) => {
                return response.json();
            })
            .then((friendObjects) => {
                const userFriends = friendObjects.filter(friend => { return friend.user_id == userObject.id })
                if (userFriends.length === 0) {
                    noFriends = true;
                    const friendList = document.getElementById("friend-list")
                    const notificationsDiv = document.getElementById("notifications")
                    notificationsDiv.innerHTML = `<p>You have no friends yet! Click the button to add a friend.</p>
                    `
                } else {
                    userFriends.forEach(friendObject => {
                        friendArray.push(friendObject)
                    })
                    sortFriendsByPriority()
                    turnPage()
                    // infoDisplayEventListener()
                    addNotifications(friendArray)
                }
                
            })
       
        signInDiv.style.display = "none"
        dashboardDiv.dataset.id = userObject.id
        dashboardDiv.style.height = "100vh"
        dashboardDiv.innerHTML = `
        <button id="log-out" class="button">Log Out</button><br>
        <h1 id="salutation">Hi ${userObject.name}, Welcome to Bestie!</h1>
        <div id="notifications"></div>
        <div id="friend-list" class="friends">
        </div>
        <div id="page-btn-div"></div>
        <div id="add-friend-div"><button class="button" id="add-friend-btn">Add New Friend</button></div>
        <div id="full-info-display"><ul id="friend-info"></ul><div id="friend-actions"></div></div>
        <div id="reminder-div"><button id="text-confirmation" class="button">Remind me via text!</button><br> <div>
        `

        // Get all of the user's friends from the API
        friendsList = document.getElementById("friend-list")
        buttonDiv = document.getElementById("page-btn-div")
        logOutButton = document.getElementById("log-out")

        const friendInfo = document.getElementById("friend-info")
        friendInfo.style.display = "none"


        logOutButton.addEventListener("click", function(event){
            logOut()
        })
    }

    const sortFriendsByPriority = () => {
        let sortArray = []
        friendArray.forEach(friend => {
            if (friend.priority === "High") {

                sortArray.push(friend)
            }
        })
        friendArray.forEach(friend => {
            if (friend.priority === "Medium") {
                sortArray.push(friend)
            }
        })
        friendArray.forEach(friend => {
            if (friend.priority === "Low") {
                sortArray.push(friend)
            }
        })
        friendArray = sortArray
    }

    //Notifications    
    const addNotifications = (friendArray) => {
        const notificationArray = []
        const todayDate = new Date().toJSON().slice(0, 10)
        friendArray.forEach(friend => {
            if (friend.date_last_outreach != null) {
                //Get time difference
                const daysSinceOutreach = (new Date(todayDate).getTime() - new Date(friend.date_last_outreach).getTime()) / (1000 * 3600 * 24)
                if (daysSinceOutreach > 14) {
                    const notification = `You haven't talked to ${friend.name} in ${daysSinceOutreach} days`
                    notificationArray.push(notification)
                }
            }
        })
        const notificationsDiv = document.getElementById("notifications")

        if (notificationArray.length > 0) {
            // notificationsDiv.innerHTML = "<p><strong>Notifications:</strong></p>"
            notificationsDiv.innerHTML = ""
            notificationsDiv.style.display = "block"
            notificationArray.forEach(notification => {
                const notificationP = document.createElement("li")
                notificationP.innerText = notification
                notificationsDiv.append(notificationP)
            })
        } else if (notificationArray.length === 0) {
            notificationsDiv.style.display = "none"
        }
    }

    // const newFriendFormEventListener = () => {
    dashboardDiv.addEventListener("submit", e => {
        e.preventDefault()
        if (e.target === document.getElementById("new-friend-form")) {
            const userId = dashboardDiv.dataset.id
            const friendName = e.target.elements[0].value
            const friendPhoneNumber = e.target.elements[1].value
            const friendImage = e.target.elements[2].value
            const friendPriority = e.target.elements[3].value
            //post request to create the new friend in the database tied to the currently logged in user
            fetch(friendsURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: friendName,
                    phone_number: friendPhoneNumber,
                    image_url: friendImage,
                    priority: friendPriority,
                    date_last_outreach: null,
                    user_id: userId
                }),
            })
                .then((response) => response.json())
                .then((friendObject) => {
                    document.getElementById("new-friend-form").remove()
                    if (friendObject["errors"]) {
                        renderFriendFormAgain(friendObject)
                    } else {
                        friendArray.push(friendObject)
                        sortFriendsByPriority()
                        page = 1
                        turnPage()
                    }
                })
        } else if (e.target === document.getElementById("datepicker")) 
        {
            e.preventDefault()
            const newDate = e.target.elements[0].value
            const fullInfoBox = document.getElementById("full-info-display")
            const friendInfo = document.getElementById("friend-info")
            const friendActions = document.getElementById("friend-actions")
            const friendId = fullInfoBox.querySelector("li").id
            const todayDate = new Date().toJSON().slice(0, 10)
            console.log(friendId)
            fetch(`${friendsURL}/${friendId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ date_last_outreach: newDate })
            })
            .then(response => response.json())
            .then(friendObj => {
                friendArray.forEach(friend => {
                    if (friend.id === friendObj.id) {
                        friend.date_last_outreach = friendObj.date_last_outreach
                    }
                })
                addNotifications(friendArray)
                friendInfo.dataset.id = friendId
                friendInfo.innerHTML = `<li> <strong>Name:</strong> ${friendObj.name}</li><br>
                <li><strong>Phone Number:</strong> ${friendObj.phone_number}</li><br>
                <li><strong>Last Contacted: </strong> ${friendObj.date_last_outreach.slice(0, 10)} -- Contacted!</li><br>`
                friendActions.innerHTML = `
                <form id="datepicker"> 
                    <input type="date" value="${todayDate}" max="${todayDate}">
                    <input class="button" type="submit" value="Save" >
                </form>
                <button class="button" id="delete-button">Remove Friend</button>
                `
            })
            
        }

    })

    function renderFriendFormAgain(friendObject) {
        addFriendDiv = document.getElementById("add-friend-div")
        let nameError = ""
        let phoneError = ""
        let imageError = ""
        let priorityError = ""
        friendObject["errors"].forEach(error => {
            switch (error.split(" ")[0]) {
                case 'Name':
                    nameError = error;
                    break;
                case 'Phone':
                    phoneError = error;
                    break
                case 'Image':
                    imageError = error;
                    break
                case "Priority":
                    priorityError = error;
            }
        })
        // const anotherFriendForm = document.createElement("div")
        // anotherFriendForm.id = "new-friend-form"
        newFriendForm.innerHTML = `
                <form id="new-friend-form">
                    <input type="text" name="name" placeholder="Name...">
                    ${nameError}
                    <br>
                    <input type="text" name="phone-number" placeholder="Phone number...">
                    ${phoneError}
                    <br>
                    <input type="text" name="image-url" placeholder="Profile image link...">
                    ${imageError}
                    <br>
                    <select id="priority">
                        <option class="priority-option" value="High">High</option>
                        <option class="priority-option" value="Medium">Medium</option>
                        <option class="priority-option" value="Low">Low</option>
                    </select>
                    ${priorityError}
                    <br>
                    <input class="button" type="submit" value="Add">
                </form>
                `
        addFriendDiv.append(newFriendForm)
    }


    // Adds six friends to the queue to be added to the DOM
    const turnPage = () => {
        if (friendsList) {
            friendsList.innerHTML = ''
        }
        for (i = 0; i < 6; i++) {
            let item = (page - 1) * 6 + i
            if (friendArray[item]) {
                addFriend(friendArray[(page - 1) * 6 + i])
            }
        }
        turnPageButtonsAdder()
    }

    const turnPageButtonsAdder = () => {
        if (buttonDiv) {
            buttonDiv.innerHTML = ''
        }
        if (page > 1) {
            turnPageDownButton = document.createElement('button')
            turnPageDownButton.id = "page-down-btn"
            turnPageDownButton.className = "button"
            turnPageDownButton.innerText = `Page ${(page - 1)}`
            buttonDiv.append(turnPageDownButton)
            turnPageDownEventAdder()
        }
        if ((page * 6) < friendArray.length) {
            turnPageUpButton = document.createElement('button')
            turnPageUpButton.id = "page-up-btn"
            turnPageUpButton.className = "button"
            turnPageUpButton.innerText = `Page ${(page + 1)}`
            buttonDiv.append(turnPageUpButton)
            turnPageUpEventAdder()
        }
    }

    const turnPageUpEventAdder = () => {
        turnPageUpButton = document.getElementById("page-up-btn")
        turnPageUpButton.addEventListener("click", function () {
            page++
            turnPage()
        })
    }

    const turnPageDownEventAdder = () => {
        turnPageDownButton = document.getElementById("page-down-btn")
        turnPageDownButton.addEventListener("click", function () {
            page--
            turnPage()
        })
    }

    // Add a friend to the DOM
    const addFriend = (friendObject) => {
        // friendArray.push(friendObject)
        const friendDiv = document.createElement("div")
        friendDiv.className = "friend-item"
        friendDiv.id = friendObject.id
        friendDiv.innerHTML = `<img class="friend-image" id=${friendObject.id} src=${friendObject.image_url}> </img>
        <h3 class="friend-name" id=${friendObject.id} data-id=${friendObject.id}><strong><mark id=${friendObject.id} class="friend-name">${friendObject.name}</mark></strong></h3>
        `
        friendsList.append(friendDiv)
    }

    const newFriendForm = document.createElement("div")
    newFriendForm.id = "new-friend-form-div"

    // Add a new friend functionality
    dashboardDiv.addEventListener("click", e => {
        console.log(e.target)
        const fullInfoBox = document.getElementById("full-info-display")
        const friendInfo = document.getElementById("friend-info")
        const friendActions = document.getElementById("friend-actions")
        if (e.target === document.getElementById("add-friend-btn")) {
            friendInfo.style.display = "none"
            friendActions.innerHTML = ""
            if (addFriendToggle) {
                addFriendDiv = document.getElementById("add-friend-div")
                newFriendForm.innerHTML = `
                    <form id="new-friend-form">
                        <input type="text" name="name" placeholder="Name...">
                        <br>
                        <input type="text" name="phone-number" placeholder="Phone number...">
                        <br>
                        <input type="text" name="image-url" placeholder="Profile image link...">
                        <br>
                        <select id="priority">
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <br>
                        <input class="button" type="submit" value="Add">
                    </form>
                    `
                addFriendDiv.append(newFriendForm)
            } else {
                newFriendForm.remove()
            }
            addFriendToggle = !addFriendToggle
        }
        if (e.target === document.getElementById("delete-button")){
            console.log("hitting delete")

            friendID = parseInt(e.target.parentNode.parentNode.dataset.id)
            fetch(`${friendsURL}/${friendID}`, {
                method: "DELETE",
            })
            .then(
                friendInfo.style.display = "none", 
                friendActions.innerHTML = ""
                )
            .then(function(){
                for(let i = 0; i < friendArray.length; i++){
                    if (friendArray[i].id === friendID){
                        friendArray.splice(i, 1)
                    }
                }
            })
            .then(function(){
                page = 1
                turnPage()
            })
        }
        console.log(e.target.className)
        if (e.target.className === "friend-item" || e.target.className === "friend-image" || e.target.className === "friend-name") {
            const newFriendFormDiv = document.getElementById("new-friend-form-div")
            if (newFriendFormDiv) {
                newFriendFormDiv.innerHTML = ""
            }
            let id = parseInt(e.target.id)
            let foundFriend
            friendArray.forEach(friend => {
                if (friend.id === id) {
                    foundFriend = friend
                }
            })
            const todayDate = new Date().toJSON().slice(0, 10)
            const dateLastOutreach = foundFriend.date_last_outreach
            const displayDate = dateLastOutreach ? `${dateLastOutreach.slice(0, 10)}` : "Not yet contacted"
            fullInfoBox.dataset.id = foundFriend.id
            friendInfo.dataset.id = foundFriend.id
            friendInfo.style.display = "block"
            friendInfo.innerHTML = `<li id=${id}><strong>Name:</strong> ${foundFriend.name}</li><br>
            <li><strong>Phone Number:</strong> ${foundFriend.phone_number}</li><br>
            <li><strong>Last Contacted:</strong> ${displayDate}</li><br>`
            friendActions.innerHTML = `
            <form id="datepicker"> 
                <input type="date" value="${todayDate}" max="${todayDate}">
                <input class="button" type="submit" value="Save">
            </form>
            <button class="button" id="delete-button">Remove Friend</button>
            `
        } if (e.target === document.getElementById("text-confirmation")){
            const userId = document.getElementById("dashboard").dataset.id
            console.log(userId)
            fetch(`${friendsURL}/${userId}`)
            // .then((response) => {
            //     return response.json()
            // })
            .then((myJson) => {
                console.log(myJson)
            });
        }
    })

    const logOut = () => {
        dashboardDiv.innerHTML = ""
        signInDiv.style.display = "block"
        dashboardDiv.style.height = "auto"
        friendArray = []
    }

    const backToLoginEventAdder = () => {
        const loginAgain = document.getElementById("back-to-login-button")
        loginAgain.addEventListener("click", function(event){
            backToLogin()
        })
    }
    
    const backToLogin = () => {
        signInForm.style.display = "block"
        signUpForm.innerHTML = ""
        document.getElementById("no-account").style.display = "block"
        signUpButton.style.display = "block"
    }
});
