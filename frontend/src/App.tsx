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
// We triple the images to ensure seamless looping
const infiniteImages = [...bannerImages, ...bannerImages, ...bannerImages];

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Video {
  id: string;
  name: string;
  url: string;
  user_id?: string;
  type?: 'video' | 'image';
  caption?: string;
  like_count?: number;
  has_liked?: boolean;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [isMuted, setIsMuted] = useState(true);
  
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [activeMenuId, setActiveMenuMenuId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewPostComment] = useState('');

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

  // Robust Infinite Scroll Logic
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    let requestRef: number;
    const speed = 0.8; // Smooth auto-scroll speed

    const updateScroll = () => {
      if (heroEl) {
        // Auto-increment scroll
        heroEl.scrollLeft += speed;

        // Reset logic: Since we have 3 sets, we loop when we enter the 1st or 3rd set
        const totalWidth = heroEl.scrollWidth;
        const setWidth = totalWidth / 3;

        if (heroEl.scrollLeft >= setWidth * 2) {
          // If we reached the start of the 3rd set, jump back to the start of the 2nd set
          heroEl.scrollLeft -= setWidth;
        } else if (heroEl.scrollLeft <= 0) {
          // If we somehow go backwards to the very start, jump to the start of the 2nd set
          heroEl.scrollLeft += setWidth;
        }
      }
      requestRef = requestAnimationFrame(updateScroll);
    };

    // Give images a moment to load so scrollWidth is accurate
    const timer = setTimeout(() => {
      const setWidth = heroEl.scrollWidth / 3;
      heroEl.scrollLeft = setWidth;
      requestRef = requestAnimationFrame(updateScroll);
    }, 500);

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        // Manual scrolling is additive
        heroEl.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    heroEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(requestRef);
      heroEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const videosWithLikes = await Promise.all((data || []).map(async (v) => {
        const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('video_id', v.id);
        const { data: userLike } = session ? await supabase.from('likes').select('*').eq('video_id', v.id).eq('user_id', session.user.id).single() : { data: null };
        
        return {
          ...v,
          like_count: count || 0,
          has_liked: !!userLike
        };
      }));

      setVideos(videosWithLikes);
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
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('videos').insert([
        { 
          name: file.name, 
          url: publicUrl, 
          user_id: session.user.id,
          type: isVideo ? 'video' : 'image',
          caption: newPostCaption
        }
      ]);

      if (dbError) throw dbError;
      
      setIsPostModalOpen(false);
      setNewPostCaption('');
      fetchVideos();
    } catch (error) {
      alert('Upload failed: ' + (error as any).message);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    try {
      const { error } = await supabase.from('videos').delete().eq('id', videoToDelete.id);
      if (error) throw error;
      setVideoToDelete(null);
      fetchVideos();
      if (selectedVideo?.id === videoToDelete.id) setSelectedVideo(null);
    } catch (error) {
      alert('Delete failed');
    }
  };

  const handleLike = async (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    if (!session) return alert('Please sign in to like!');

    if (video.has_liked) {
      await supabase.from('likes').delete().eq('video_id', video.id).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert([{ video_id: video.id, user_id: session.user.id }]);
    }
    fetchVideos();
    if (selectedVideo?.id === video.id) {
      setSelectedVideo({ ...video, has_liked: !video.has_liked, like_count: (video.like_count || 0) + (video.has_liked ? -1 : 1) });
    }
  };

  const fetchComments = async (videoId: string) => {
    const { data } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true });
    setComments(data || []);
  };

  useEffect(() => {
    if (selectedVideo) fetchComments(selectedVideo.id);
  }, [selectedVideo]);

  const postComment = async () => {
    if (!newComment.trim() || !selectedVideo || !session) return;
    const { error } = await supabase.from('comments').insert([
      { video_id: selectedVideo.id, user_id: session.user.id, content: newComment }
    ]);
    if (!error) {
      setNewPostComment('');
      fetchComments(selectedVideo.id);
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
          <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            <div className="toggle-circle"></div>
          </div>
          <button className="upload-btn" onClick={() => setIsPostModalOpen(true)}>New Post</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', color: '#888' }}>Sign Out</button>
        </div>
      </header>

      <section className="hero-container" ref={heroRef}>
        <div className="hero-track">
          {infiniteImages.map((img, index) => (
            <div key={index} className="hero-slide"><img src={img} alt="" /></div>
          ))}
        </div>
      </section>

      <div className="profile-section">
        <div className="avatar-placeholder" style={{ backgroundImage: `url(${img1})` }} />
        <div className="profile-info">
          <h2>Deez "Spicy" Satti</h2>
          <p>@AbdelBatti • 6.7M Likes • Premium Creator</p>
        </div>
      </div>

      <main className="container">
        <div className="video-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card" onClick={() => setSelectedVideo(video)}>
              <div className="video-card-header" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="mini-avatar" style={{ backgroundImage: `url(${img1})` }} />
                  <span style={{ fontWeight: 700 }}>User</span>
                </div>
                {(isAdmin || video.user_id === session.user.id) && (
                  <div>
                    <button className="options-btn" onClick={(e) => { e.stopPropagation(); setActiveMenuMenuId(activeMenuId === video.id ? null : video.id); }}>•••</button>
                    {activeMenuId === video.id && (
                      <div className="options-menu">
                        <div className="options-item" onClick={(e) => { e.stopPropagation(); setVideoToDelete(video); setActiveMenuMenuId(null); }}>Delete Post</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="video-thumbnail">
                {video.type === 'image' ? (
                  <img src={video.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <video 
                      src={video.url} 
                      autoPlay 
                      muted={isMuted} 
                      loop 
                      playsInline 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button 
                      className="mute-btn" 
                      onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    >
                      {isMuted ? '🔇' : '🔊'}
                    </button>
                  </>
                )}
              </div>
              <div className="video-info">
                <div className="video-title">{video.caption || video.name}</div>
                <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>❤️ {video.like_count} Likes</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* New Post Modal */}
      {isPostModalOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <h3>Create New Post</h3>
            <textarea className="post-form-input" placeholder="Add a caption..." value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)} />
            <input type="file" accept="video/*,image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <div className="modal-buttons">
              <button className="btn-confirm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : 'Select Media'}</button>
              <button className="btn-cancel" onClick={() => setIsPostModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <h3>Are you sure you want to delete this post?</h3>
            <div className="modal-buttons">
              <button className="btn-confirm" onClick={confirmDelete}>Yes, Delete</button>
              <button className="btn-cancel" onClick={() => setVideoToDelete(null)}>No, Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedVideo && (
        <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {selectedVideo.type === 'image' ? <img src={selectedVideo.url} style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} /> : <video controls autoPlay src={selectedVideo.url} style={{ maxHeight: '60vh' }} />}
            <div style={{ padding: 20, backgroundColor: 'var(--header-bg)', color: 'var(--text-color)' }}>
              <h3>{selectedVideo.caption || selectedVideo.name}</h3>
              <div style={{ display: 'flex', gap: 20, margin: '15px 0' }}>
                <button 
                  onClick={(e) => handleLike(e, selectedVideo)} 
                  style={{ 
                    background: selectedVideo.has_liked ? '#ff8c00' : 'none', 
                    border: '1px solid #ddd', 
                    padding: '8px 20px', 
                    borderRadius: '30px', 
                    color: selectedVideo.has_liked ? 'black' : 'inherit',
                    fontWeight: 'bold'
                  }}
                >
                  ❤️ {selectedVideo.like_count} Likes
                </button>
              </div>
              <div className="comments-container">
                {comments.map(c => <div key={c.id} className="comment-item"><span className="comment-user">User:</span> {c.content}</div>)}
              </div>
              <div className="comment-input-group">
                <input className="comment-input" value={newComment} onChange={(e) => setNewPostComment(e.target.value)} placeholder="Add a comment..." />
                <button className="comment-submit" onClick={postComment}>Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default App
