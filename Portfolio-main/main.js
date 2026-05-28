var audio = document.getElementById("audioPlayer"),
    loader = document.getElementById("preloader");

function settingtoggle() {
    document.getElementById("setting-container").classList.toggle("settingactivate");
    document.getElementById("visualmodetogglebuttoncontainer").classList.toggle("visualmodeshow");
    document.getElementById("soundtogglebuttoncontainer").classList.toggle("soundmodeshow");
}

function playpause() {
    if (document.getElementById("switchforsound").checked == false) {
        audio.pause();
    } else {
        audio.play();
    }
}

function visualmode() {
    document.body.classList.toggle("light-mode");
    document.getElementById("labelforsound").classList.toggle("invertsoundlabel");
    document.querySelector(".about-heading-article").classList.toggle("heading-article-light");
    document.querySelector(".aboutHeadingP").classList.toggle("heading-article-light");
    document.querySelector(".skills-heading-article").classList.toggle("heading-article-light");
    document.querySelector(".skillsHeadingP").classList.toggle("heading-article-light");
    document.querySelector(".projects-heading-article").classList.toggle("heading-article-light");
    document.querySelector(".projectsHeadingP").classList.toggle("heading-article-light");
    document.querySelector(".frontend-dev-heading").classList.toggle("heading-article-light");
    document.querySelector(".designing-heading").classList.toggle("heading-article-light");
    document.querySelector(".languages-heading").classList.toggle("heading-article-light");
    document.getElementById("html")?.classList.toggle("language-gradient-class");
    document.getElementById("css")?.classList.toggle("language-gradient-class");
    document.getElementById("bootstrap")?.classList.toggle("language-gradient-class");
    document.getElementById("react")?.classList.toggle("language-gradient-class");
    document.getElementById("js")?.classList.toggle("language-gradient-class");
    document.getElementById("ap")?.classList.toggle("language-gradient-class");
    document.getElementById("canva")?.classList.toggle("language-gradient-class");
    document.getElementById("ai")?.classList.toggle("language-gradient-class");
    document.getElementById("c")?.classList.toggle("language-gradient-class");
    document.getElementById("cpp")?.classList.toggle("language-gradient-class");
    document.querySelectorAll(".project-box").forEach(e => {
        e.classList.toggle("language-gradient-class");
    });
}

window.addEventListener("load", function() {
    loader.style.display = "none";
    document.querySelector(".hey").classList.add("popup");
});

let emptyArea = document.getElementById("emptyarea"),
    mobileTogglemenu = document.getElementById("mobiletogglemenu");

function hamburgerMenu() {
    document.body.classList.toggle("stopscrolling");
    document.getElementById("mobiletogglemenu").classList.toggle("show-toggle-menu");
    document.getElementById("emptyarea").classList.toggle("blur-class");
    document.getElementById("burger-bar1").classList.toggle("hamburger-animation1");
    document.getElementById("burger-bar2").classList.toggle("hamburger-animation2");
    document.getElementById("burger-bar3").classList.toggle("hamburger-animation3");
}

function hidemenubyli() {
    document.body.classList.toggle("stopscrolling");
    document.getElementById("mobiletogglemenu").classList.remove("show-toggle-menu");
    document.getElementById("emptyarea").classList.remove("blur-class");
    document.getElementById("burger-bar1").classList.remove("hamburger-animation1");
    document.getElementById("burger-bar2").classList.remove("hamburger-animation2");
    document.getElementById("burger-bar3").classList.remove("hamburger-animation3");
}

function hidetogglemenu() {
    document.body.classList.remove("stopscrolling");
    document.getElementById("mobiletogglemenu").classList.remove("show-toggle-menu");
    document.getElementById("emptyarea").classList.remove("blur-class");
    document.getElementById("burger-bar1").classList.remove("hamburger-animation1");
    document.getElementById("burger-bar2").classList.remove("hamburger-animation2");
    document.getElementById("burger-bar3").classList.remove("hamburger-animation3");
}

emptyArea.addEventListener("click", hidetogglemenu);

const sections = document.querySelectorAll("section"),
    navLi = document.querySelectorAll(".navbar .navbar-tabs .navbar-tabs-ul a li"),
    mobilenavLi = document.querySelectorAll(".mobiletogglemenu .mobile-navbar-tabs-ul a li");

window.addEventListener("scroll", () => {
    let currentSection = "";
    sections.forEach(section => {
        let sectionTop = section.offsetTop;
        let sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 500) {
            currentSection = section.getAttribute("id");
        }
    });
    mobilenavLi.forEach(li => {
        li.classList.remove("activeThismobiletab");
        if (li.classList.contains(currentSection)) {
            li.classList.add("activeThismobiletab");
        }
    });
    navLi.forEach(li => {
        li.classList.remove("activeThistab");
        if (li.classList.contains(currentSection)) {
            li.classList.add("activeThistab");
        }
    });
});

console.log("%c Designed and Developed by Ram nathawat ", "background-image: linear-gradient(90deg,#8000ff,#6bc5f8); color: white;font-weight:900;font-size:1rem; padding:20px;");

let mybutton = document.getElementById("backtotopbutton");

function scrollFunction() {
    if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
}

function scrolltoTopfunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

window.onscroll = function() {
    scrollFunction();
};

document.addEventListener("contextmenu", function(e) {
    if (e.target.nodeName === "IMG") {
        e.preventDefault();
    }
}, false);
