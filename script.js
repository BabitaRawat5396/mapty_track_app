"use strict";

// DOM Elements
const workoutDistance = document.querySelector(".form__input--distance");
const workoutDuration = document.querySelector(".form__input--duration");
const workoutElevGain = document.querySelector(".form__input--elevgain");
const workoutCadence = document.querySelector(".form__input--cadence");
const closeSideBar = document.querySelector(".close__side__bar");
const workoutType = document.querySelector(".form__input--type");
const workoutWindow = document.querySelector(".workout__window");
const workoutsMenu = document.querySelector(".workouts__menu");
const workoutsMenuIcon = document.querySelector(".workouts__menu--icon");
const elevgainDiv = document.querySelector("#elevgain__div");
const workoutInfo = document.querySelector(".workout__info");
const candenceDiv = document.querySelector("#cadence__div");
const overlayWindow = document.querySelector(".overlay");
const threeLines = document.querySelector(".threeLines");
const workouts = document.querySelector(".workouts");
const form = document.querySelector(".form");
const map = document.querySelector("#map");

// Workout Class: Represents a generic workout
class Workout {
  // Automatically generate a unique ID based on current timestamp
  id = Math.floor(Math.random() * Date.now()).toString(16);

  // Record the date when the workout is created
  date = new Date();

  /**
   * Creates a new workout.
   * @param {Array} coords - Coordinates of the workout location [latitude, longitude].
   * @param {number} distance - Distance covered in the workout (in kilometers).
   * @param {number} duration - Duration of the workout (in minutes).
   */
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  /**
   * Sets the description for the workout based on the workout type and date.
   * @private
   */
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.desc = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDay()}`;
  }
}

// Running Class: Represents a running workout, extends Workout class
class Running extends Workout {
  type = "running";

  /**
   * Creates a new running workout.
   * @param {Array} coords - Coordinates of the workout location [latitude, longitude].
   * @param {number} distance - Distance covered in the workout (in kilometers).
   * @param {number} duration - Duration of the workout (in minutes).
   * @param {number} cadence - Cadence (steps per minute) during the running workout.
   */
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._setDescription();
    this.calcPace();
  }

  /**
   * Calculates the pace of the running workout (minutes per kilometer).
   * @returns {number} - Pace value.
   */
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Cycling Class: Represents a cycling workout, extends Workout class
class Cycling extends Workout {
  type = "cycling";

  /**
   * Creates a new cycling workout.
   * @param {Array} coords - Coordinates of the workout location [latitude, longitude].
   * @param {number} distance - Distance covered in the workout (in kilometers).
   * @param {number} duration - Duration of the workout (in minutes).
   * @param {number} elevGain - Elevation gain during the cycling workout.
   */
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this._setDescription();
    this.calcSpeed();
  }

  /**
   * Calculates the speed of the cycling workout (kilometers per hour).
   * @returns {number} - Speed value.
   */
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/**
 * App Class: Represents the main application for managing workouts.
 */
class App {
  // Private fields
  #mapEvent;
  #map;
  #workouts = [];
  #editObject;
  /**
   * Creates a new instance of the App.
   * Initializes event listeners and retrieves the user's geolocation.
   */
  constructor() {
    this._getCurrentPosition();
    form.addEventListener("submit", this._submitForm.bind(this));
    document.addEventListener("keydown", this._hideForm.bind(this));
    workoutType.addEventListener("change", this._toggleFormFields.bind(this));
    workoutWindow.addEventListener("click", this._moveToLocation.bind(this));
    threeLines.addEventListener("click", this._showWorkoutSideBar.bind(this));
    closeSideBar.addEventListener("click", this._hideWorkoutSideBar);
    // prettier-ignore
    workoutsMenuIcon.addEventListener("click",this._showWorkoutsRelatedOperations.bind(this));
    document.body.addEventListener("click", this._hideMenu.bind(this));
    this.#workouts = [];
  }

  /**
   * Retrieves the current geolocation position of the user.
   * @private
   */
  _getCurrentPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function error(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
      }
    );
  }

  /**
   * Loads the map using Leaflet library and sets up event listeners.
   * @param {object} pos - Geolocation position object.
   * @private
   */
  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    this.#map = L.map("map").setView([latitude, longitude], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    this.#map.addEventListener("click", this._renderForm.bind(this));
    this._getWorkoutLocalStorage();
  }

  /**
   * Toggles specified classes on an array of elements.
   * @param {Array} element - Array of HTML elements.
   * @param {string} classname - Class name to toggle.
   * @private
   */
  _toggleClasses(element, classname) {
    element[0].classList.toggle(classname);
    element[1].classList.toggle(classname);
  }

  /**
   * Toggles the visibility of form fields based on the selected workout type.
   * @private
   */
  _toggleFormFields() {
    this._toggleClasses([candenceDiv, elevgainDiv], "form_row--hidden");
  }

  /**
   * Renders the workout form on the map click event.
   * @param {object} e - Click event object.
   * @private
   */
  _renderForm(e) {
    if (workoutWindow.classList.contains("sideBar__window")) {
      this._hideWorkoutSideBar();
    }
    document.querySelector(".sidebar__icons").style.display = "none";

    workoutWindow.classList.remove("workout__window--hidden");
    overlayWindow.classList.remove("workout__window--hidden");

    this.#mapEvent = e;
  }

  /**
   * Renders a marker for the given workout on the map.
   * @param {object} workout - Workout object.
   * @private
   */
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️ " : "🚴‍♀️ "}${workout.desc}`
      )
      .openPopup();
  }

  /**
   * Removes a marker for the given workout on the map based on the coords inside workout object
   * @param {object} workout - Workout object.
   * @private
   */
  _removeWorkoutMarker(workout) {
    const mapLayers = this.#map._layers; // Access the map layers directly

    for (const layerId in mapLayers) {
      const layer = mapLayers[layerId];

      if (
        layer instanceof L.Marker &&
        layer.getLatLng().equals(workout.coords)
      ) {
        // Remove the marker from the map
        this.#map.removeLayer(layer);
        break; // Exit the loop once the marker is found and removed
      }
    }
  }

  /**
   * Hides the workout form on the 'Escape' key press event.
   * @param {object} e - Key press event object.
   * @private
   */
  _hideForm(e) {
    if (e.key !== "Escape") return;
    workoutWindow.classList.add("workout__window--hidden");
    overlayWindow.classList.add("workout__window--hidden");
    workoutsMenu.classList.add("workouts__menu--hidden");
  }

  /**
   * Validates form fields to ensure they are finite numbers greater than zero.
   * @param {Array} formFields - Array of form input values.
   * @returns {boolean} - True if all form fields are valid, false otherwise.
   * @private
   */
  _formValidation(formFields) {
    return formFields.every(
      (field) => Number.isFinite(+field) && +field > 0 && +field < 100
    );
  }

  /**
   * Renders the workout details in the workout list.
   * @param {object} workout - Workout object.
   * @private
   */

  _renderWorkout(workout) {
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <div class='workout__heading'>
            <h2 class="workout__title">${workout.desc}</h2>
            <p class='workout__menu__icon'>&#8942;</p>
          </div>
          <div class='workout__menu workout__menu--hidden'>
             <p class='workout__menu--${
               workout.type
             } workout__menu--edit'>Edit</p>
             <p class='workout__menu--${
               workout.type
             } workout__menu--delete'>Delete</p>
          </div>
          <div class='workout__info'>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${
                workout.type === "running"
                  ? workout.pace.toFixed(1)
                  : workout.speed.toFixed(1)
              }</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === "running" ? "🦶🏼" : "⛰"
              }</span>
              <span class="workout__value">${
                workout.type === "running" ? workout.cadence : workout.elevGain
              }</span>
              <span class="workout__unit">spm</span>
            </div>
          </div>
        </li>`;

    form.insertAdjacentHTML("afterend", html);
  }

  /**
   * Stores the workouts in the local storage.
   * @param {Array} workouts - Array of workout objects.
   * @private
   */
  _setWorkoutLocalStorage(workouts) {
    localStorage.removeItem("workouts");
    localStorage.setItem("workouts", JSON.stringify(workouts));
  }

  /**
   * Retrieves workouts from local storage and renders them on the map and workout list.
   * @private
   */
  _getWorkoutLocalStorage() {
    const workouts = JSON.parse(localStorage.getItem("workouts"));
    if (!workouts) return;

    this.#workouts = workouts;
    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);
      this._renderWorkoutMarker.bind(this, workout)();
    });
  }

  /**
   * Handles the form submission event, creates a new workout, and updates the UI.
   * @param {object} e - Form submission event object.
   * @private
   */
  _submitForm(e) {
    e.preventDefault();

    // prettier-ignore
    let lat, lng;

    if (this.#editObject && Array.isArray(this.#editObject.coords)) {
      [lat, lng] = this.#editObject.coords;
    } else if (this.#mapEvent && this.#mapEvent.latlng) {
      ({ lat, lng } = this.#mapEvent.latlng);
    }

    let workout;

    if (workoutType.value === "running") {
      const formFields = [
        workoutDistance.value,
        workoutDuration.value,
        workoutCadence.value,
      ];

      if (this._formValidation(formFields)) {
        workout = new Running(
          [lat, lng],
          workoutDistance.value,
          workoutDuration.value,
          workoutCadence.value
        );
        workoutDistance.value =
          workoutDuration.value =
          workoutCadence.value =
            "";
      }
    }

    if (workoutType.value === "cycling") {
      const formFields = [
        workoutDistance.value,
        workoutDuration.value,
        workoutElevGain.value,
      ];
      if (this._formValidation(formFields)) {
        workout = new Cycling(
          [lat, lng],
          workoutDistance.value,
          workoutDuration.value,
          workoutElevGain.value
        );
        workoutDistance.value =
          workoutDuration.value =
          workoutElevGain.value =
            "";
        workoutType.value = "running";
      }
    }
    console.log(workoutType.value);
    console.log(workout);
    if (this.#editObject) {
      this.#workouts.forEach((workoutEl) => {
        if (workoutEl.id === this.#editObject.id) {
          document
            .querySelector(`.workout[data-id="${workoutEl.id}"]`)
            .remove();
          workoutEl.distance = workout.distance;
          workoutEl.duration = workout.duration;
          if (workout.type === "running") {
            workoutEl.cadence = workout.cadence;
          } else {
            workoutEl.elevGain = workout.elevGain;
          }
          workoutEl.type = workout.type;
        }
      });
    } else {
      this.#workouts.push(workout);
    }

    // Hiding form
    workoutWindow.classList.add("workout__window--hidden");
    overlayWindow.classList.add("workout__window--hidden");

    // Add marker and Pop up to the location
    this._renderWorkoutMarker(workout);

    // Show list of workouts
    this._renderWorkout(workout);

    // Setting values to local storage
    this._setWorkoutLocalStorage(this.#workouts);
  }

  /**
   * Moves the map view to the location of the clicked workout in the workout list.
   * @param {object} e - Click event object.
   * @private
   */
  _moveToLocation(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    // Toggling Workout menu
    if (!workout) return;
    if (e.target.classList.contains("workout__menu__icon")) {
      this._toggleWorkoutMenu(workoutEl);
      return;
    }

    // After clicking one of the section inside menu
    if (e.target.classList.contains(`workout__menu--${workout.type}`)) {
      this._menuClickhandle(e.target, workout, workoutEl);
      return;
    }

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  /**
   * Handles the click event on the workout menu, allowing for workout editing or deletion.
   *
   * @param {HTMLElement} element - Clicked element inside the workout menu.
   * @param {Object} workout - Workout object associated with the clicked menu.
   * @param {HTMLElement} workoutEl - Workout element containing the menu.
   * @private
   */
  _menuClickhandle(element, workout, workoutEl) {
    if (element.classList.contains("workout__menu--edit")) {
      this._toggleWorkoutMenu(workoutEl);
      this._editWorkout(workout);
    }
    if (element.classList.contains("workout__menu--delete")) {
      this._deleteWorkout(workout);
    }
    this.#editObject = workout;
  }

  /**
   * Initiates the editing process for a specific workout.
   *
   * @param {Object} workout - Workout object to be edited.
   * @private
   */
  _editWorkout(workout) {
    // Opening Form to edit the workout
    this._renderForm.call(this);

    // Fill the current workout data on form
    workoutDistance.value = workout.distance;
    workoutDuration.value = workout.duration;
    workoutType.value = workout.type;
    // prettier-ignore
    if( workout.type === "running"){
      workoutCadence.value = workout.cadence;
    }else{
      this._toggleFormFields();
      workoutElevGain.value = workout.elevGain;
    }
  }

  /**
   * Deletes a specific workout from the application, removing it from the UI, internal array, and map.
   *
   * @param {Object} workout - Workout object to be deleted.
   * @private
   */
  _deleteWorkout(workout) {
    this.#workouts.forEach((workoutEl, idx) => {
      if (workoutEl.id === workout.id) {
        document.querySelector(`.workout[data-id="${workoutEl.id}"]`).remove();
        this.#workouts.splice(idx, idx + 1);
        this._removeWorkoutMarker(workoutEl);
      }
    });
    this._setWorkoutLocalStorage(this.#workouts);
  }

  /**
   * Toggles the visibility of workout-related operations, setting up event listeners.
   *
   * @private
   */
  _showWorkoutsRelatedOperations() {
    // menu toggle
    workoutsMenu.classList.toggle("workouts__menu--hidden");
    workoutsMenuIcon.classList.add("show");
    // Sorting toggle
    document.querySelector(".sort").addEventListener("click", () => {
      document
        .querySelector(".workout__sorting")
        .classList.toggle("workout__sorting--hidden");
    });

    // deleting all workouts
    document
      .querySelector(".workouts__menu--delete")
      .addEventListener("click", this._deleteAllWorkouts.bind(this));

    document.querySelector("#sortButton").addEventListener(
      "click",
      function (e) {
        if (e.target.classList.contains("workouts__menu--distance")) {
          this._sortWorkoutByDistance();
        }
        if (e.target.classList.contains("workouts__menu--duration")) {
          this._sortWorkoutByDuration();
        }
        if (e.target.classList.contains("workouts__menu--recent")) {
          this._backToNormal();
        }
      }.bind(this)
    );
  }

  _backToNormal() {
    this.#workouts.forEach((workout) => {
      document.querySelector(`.workout[data-id="${workout.id}"]`).remove();
    });

    this.#workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }

  _sortWorkoutByDistance() {
    const workouts = [...this.#workouts];
    workouts.forEach((workout) => {
      document.querySelector(`.workout[data-id="${workout.id}"]`).remove();
    });
    workouts.sort((a, b) => b.distance - a.distance);

    workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }

  _sortWorkoutByDuration() {
    const workouts = [...this.#workouts];
    workouts.forEach((workout) => {
      document.querySelector(`.workout[data-id="${workout.id}"]`).remove();
    });
    workouts.sort((a, b) => b.duration - a.duration);

    workouts.forEach((workout) => {
      this._renderWorkout(workout);
    });
  }

  /**
   * Deletes all workouts from the application, clearing UI, internal array, and map.
   *
   * @private
   */
  _deleteAllWorkouts() {
    this.#workouts.forEach((workoutEl) => {
      document.querySelector(`.workout[data-id="${workoutEl.id}"]`).remove();
      this._removeWorkoutMarker(workoutEl);
    });
    this.#workouts = [];
    localStorage.removeItem("workouts");
  }

  // Sort workouts based on fields

  /**
   * Displays the workout sidebar with additional options.
   * @private
   */
  _showWorkoutSideBar() {
    document.querySelector(".sidebar__icons").style.display = "flex";
    workoutWindow.classList.remove(
      "workout__window--hidden",
      "workout__window--position"
    );
    workoutWindow.classList.add("sideBar__window");
    form.style.display = "none";
  }

  /**
   * Hides the workout sidebar and restores the form display.
   * @private
   */
  _hideWorkoutSideBar() {
    document.querySelector(".sidebar__icons").style.display = "none";
    workoutWindow.classList.add(
      "workout__window--hidden",
      "workout__window--position"
    );
    workoutWindow.classList.remove("sideBar__window");
    form.style.display = "grid";
    map.style.width = "100%";
  }

  /**
   * Rebuild Running and Cycling from LocalStorage
   * More realistic error and confirmation messages
   * Ability to position the map to show all workouts
   */

  _toggleWorkoutMenu(workout) {
    workout
      .querySelector(".workout__menu")
      .classList.toggle("workout__menu--hidden");
    workout
      .querySelector(".workout__info")
      .classList.toggle("workout__info--hidden");
  }

  _hideMenu(e) {
    if (
      e.target.classList.contains("show") ||
      e.target.closest(".workouts__menu") ||
      e.target.closest(".sort")
    )
      return;
    workoutsMenu.classList.add("workouts__menu--hidden");
    workoutsMenuIcon.classList.remove("show");
  }
}

// Instantiate the App class to start the application
const app = new App();
