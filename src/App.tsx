import { useState } from "react";
import "./App.css";
import axios from "axios";
import { Vortex } from "react-loader-spinner";
import { ACCESSKEY } from "./config.ts";

function App() {
  const [imagelink, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestLink, setRequestlink] = useState("");
  const [finalImage, setFinalImage] = useState<string>();
  console.log(finalImage);

  const formData = new FormData();
  formData.append("size", "auto");

  function bgremove() {
    setRequestlink(imagelink);
    formData.append("image_url", imagelink);
    axios({
      method: "post",
      url: "https://api.remove.bg/v1.0/removebg",
      data: formData,
      responseType: "arraybuffer",
      headers: {
        "X-Api-Key": ACCESSKEY,
      },
    })
      .then((response: any) => {
        if (response.status != 200) {
          setLoading(false);
          alert("ERROR");
          return console.error("Error:", response.status, response.statusText);
        } else {
          setLoading(false);
          const blob = new Blob([response.data], { type: "image/jpeg" });
          const imageUrl = URL.createObjectURL(blob);
          setFinalImage(imageUrl);
        }
      })
      .catch((error: any) => {
        setLoading(false);
        alert("Error: " + "Unknown File Type, Please Try another Image link");
        return true;
      });
  }

  return (
    <>
      <div className="flex-center">
        <div className="logo">Erase-a-Scene</div>
        <div className="input-container">
          <input
            placeholder="https://facebook.com/sewakgtm/profilepic.png"
            onChange={(t) => {
              setImage(t.target.value);
            }}
            type="url"
            onKeyDown={(t) => {
              if (t.key == "Enter") {
                setLoading(true);
                bgremove();
              }
            }}
          />
          <button
            disabled={loading}
            type="submit"
            onClick={() => {
              bgremove();
              setLoading(true);
            }}
          >
            Remove
          </button>
        </div>
        {!loading ? (
          <div>
            {finalImage ? (
              <div className="preview-container">
                <div className="orginalImage">
                  <h3>Orginal Image</h3>
                  <img src={requestLink} height="300px" />
                </div>
                <div className="bgRemovedImage">
                  <h3>Background Removed Image</h3>
                  <img src={finalImage} height="300px" />
                </div>
              </div>
            ) : (
              ""
            )}
          </div>
        ) : (
          <Vortex
            visible={loading}
            height="80"
            width="80"
            ariaLabel="vortex-loading"
            wrapperStyle={{}}
            wrapperClass="vortex-wrapper"
            colors={["red", "green", "blue", "yellow", "orange", "purple"]}
          />
        )}
      </div>

      <footer>
        <p>
          Made with ❤️ by Sewak Gautam, With API of{" "}
          <a href="https://remove.bg" target="_blank">
            Remove.bg
          </a>{" "}
          & For OpenSource <a href="#">Contribute Here</a>
        </p>
      </footer>
    </>
  );
}

export default App;
