import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

// Provided facial images
import img1 from './assets/hero-bg.jpg'
import img2 from './assets/69472804326__54D7C92C-ADE1-4811-AE2E-690D182D1DFA.jpeg'
import img3 from './assets/IMG_1954.JPG'
import img4 from './assets/IMG_6630.JPG'
import img5 from './assets/IMG_7370.JPG'
import img6 from './assets/IMG_7667.JPG'

const bannerImages = [img1, img2, img3, img4, img5, img6];

interface Video {
  id: string;
  name: string;
  url: string;
  user_id?: string;
  type?: 'video' | 'image';
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (heroRef.current && e.deltaY !== 0) {
        e.preventDefault();
        heroRef.current.scrollLeft += e.deltaY;
      }
    };

    const heroEl = heroRef.current;
    if (heroEl) {
      heroEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (heroEl) {
        heroEl.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [session]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt || '');
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');
      
      if (!isVideo && !isImage) {
        alert('Unsupported file type. Please upload a video or image.');
        return;
      }

      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          { 
            name: file.name, 
            url: publicUrl, 
            user_id: session.user.id,
            type: isVideo ? 'video' : 'image'
          }
        ]);

      if (dbError) throw dbError;
      
      fetchVideos();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed: ' + (error as any).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteVideo = async (video: Video) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;
      fetchVideos();
      if (selectedVideo?.id === video.id) setSelectedVideo(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Delete failed');
    }
  };

  const isAdmin = session?.user?.email === 'ervendleon236@gmail.com';

  if (!session) {
    return (
      <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div className="logo" style={{ textAlign: 'center', marginBottom: '30px' }}>Deez<span>Hub</span></div>
          <Auth />
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <header>
        <div className="logo">Deez<span>Hub</span></div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div 
            className="theme-toggle" 
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div className="toggle-circle"></div>
          </div>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>{session.user.email}</span>
          <input 
            type="file" 
            accept="video/*,image/*" 
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
          <button 
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="hero-container" ref={heroRef}>
        <div className="hero-track">
          {bannerImages.map((img, index) => (
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
          <p>@AbdelBatti • 6.7M Likes • Premium Creator</p>
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
                <div className="video-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="mini-avatar" style={{ backgroundImage: `url(${img1})` }}></div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>User</div>
                  </div>
                  {(isAdmin || video.user_id === session.user.id) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteVideo(video); }}
                      style={{ background: 'none', border: 'none', color: '#e50914', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="video-thumbnail" style={{ height: '200px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                  {video.type === 'image' ? (
                    <img src={video.url} alt={video.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '3rem', opacity: 0.2 }}>▶</span>
                  )}
                </div>
                <div className="video-info">
                  <div className="video-title">{video.name}</div>
                  <div className="video-meta">VIEW {video.type === 'image' ? 'PHOTO' : 'POST'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {selectedVideo && (
        <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {selectedVideo.type === 'image' ? (
              <img src={selectedVideo.url} alt={selectedVideo.name} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            ) : (
              <video controls autoPlay src={selectedVideo.url} style={{ width: '100%', maxHeight: '70vh' }}>
                Your browser does not support the video tag.
              </video>
            )}
            <div style={{ padding: '20px', backgroundColor: 'white' }}>
              <h3>{selectedVideo.name}</h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <button style={{ background: 'none', border: '1px solid #ddd', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' }}>❤️ Like</button>
                <button style={{ background: 'none', border: '1px solid #ddd', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' }}>💬 Comment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
