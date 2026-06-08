import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

// Provided facial images
import img1 from './assets/hero-bg.jpg'
import img2 from './assets/69472804326__54D7C92C-ADE1-4811-AE2E-690D182D1DFA.jpeg'
import img3 from './assets/IMG_1954.JPG'
import img4 from './assets/IMG_6630.JPG'
import img5 from './assets/IMG_7370.JPG'
import img6 from './assets/IMG_7667.JPG'

const bannerImages = [img1, img2, img3, img4, img5, img6];
const infiniteImages = [...bannerImages, ...bannerImages];

interface Video {
  id: string;
  name: string;
  url: string;
}

function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/videos');
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);

    setUploading(true);
    try {
      await axios.post('http://localhost:5000/api/videos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchVideos();
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <header>
        <div className="logo">Deez<span>Hub</span></div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <input 
            type="file" 
            accept="video/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }}
          />
          <button 
            className="upload-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Posting...' : 'New Post'}
          </button>
        </div>
      </header>

      <section className="hero-container">
        <div className="hero-track">
          {infiniteImages.map((img, index) => (
            <div key={index} className="hero-slide">
              <img src={img} alt={`Slide ${index}`} />
            </div>
          ))}
        </div>
      </section>

      <div className="profile-section">
        <div 
          className="avatar-placeholder" 
          style={{ backgroundImage: `url(${img1})` }}
        />
        <div className="profile-info">
          <h2>Deez "Spicy" Satti</h2>
          <p>@AbdelBatti • 6.7 million likes • Premium Creator</p>
        </div>
      </div>

      <main className="container">
        <div className="video-grid">
          {videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}>
              <p style={{ color: '#888' }}>No posts yet.</p>
            </div>
          ) : (
            videos.map((video) => (
              <div 
                key={video.id} 
                className="video-card" 
                onClick={() => setSelectedVideo(video)}
              >
                <div className="video-card-header">
                  <div className="mini-avatar" style={{ backgroundImage: `url(${img1})` }}></div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Deez "Spicy" Satti</div>
                </div>
                <div className="video-thumbnail">
                  <span style={{ fontSize: '3rem', opacity: 0.2 }}>▶</span>
                </div>
                <div className="video-info">
                  <div className="video-title">{video.name}</div>
                  <div className="video-meta">VIEW POST</div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {selectedVideo && (
        <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <video controls autoPlay src={selectedVideo.url}>
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
