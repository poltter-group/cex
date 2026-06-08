import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  Repeat, 
  Image as ImageIcon, 
  Users, 
  Newspaper, 
  GraduationCap, 
  FileText,
  ChevronRight,
  Clock,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Bookmark,
  Sparkles,
  ArrowLeft,
  X
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';

export function Square({
  activeCategory: propActiveCategory,
  setActiveCategory: propSetActiveCategory,
  setCurrentView,
  setAuthMode
}: {
  activeCategory?: 'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG';
  setActiveCategory?: (v: 'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG') => void;
  setCurrentView?: (v: string) => void;
  setAuthMode?: (m: 'LOGIN' | 'REGISTER') => void;
} = {}) {
  const { user, profile } = useAuth();
  const [localCategory, setLocalCategory] = useState<'COMMUNITY' | 'NEWS' | 'ACADEMY' | 'BLOG'>('COMMUNITY');
  const activeCategory = propActiveCategory || localCategory;
  const setActiveCategory = propSetActiveCategory || setLocalCategory;
  const [inputText, setInputText] = useState('');
  
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [attachTrade, setAttachTrade] = useState(false);

  interface PostType {
    id: string | number;
    name: string;
    handle: string;
    time: string;
    content: string;
    likes: number;
    likesUsers: string[];
    retweets: number;
    replies: number;
    attachedTrade?: {
      pair: string;
      side: string;
      roi: string;
    };
  }

  const initialPosts: PostType[] = [];


  const [posts, setPosts] = useState<PostType[]>(initialPosts);

  // Read live posts from Firestore with fallback to initial posts
  useEffect(() => {
    const pathForOnSnapshot = 'posts';
    try {
      const q = query(collection(db, pathForOnSnapshot), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          // Calculate readable time from createdAt timestamp
          let postTime = 'Just now';
          if (data.createdAt) {
            const date = data.createdAt.toDate();
            const diffMs = Date.now() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            if (diffMins < 1) postTime = 'Just now';
            else if (diffMins < 60) postTime = `${diffMins}m`;
            else if (diffHours < 24) postTime = `${diffHours}h`;
            else postTime = date.toLocaleDateString();
          }
          return {
            id: doc.id,
            name: data.name || 'CEXPRO User',
            handle: data.handle || '@user',
            time: postTime,
            content: data.content || '',
            likes: data.likes || 0,
            likesUsers: data.likesUsers || [],
            retweets: data.retweets || 0,
            replies: data.replies || 0,
            attachedTrade: data.attachedTrade
          };
        });
        // Combine live posts with initial template posts for a rich feed experience
        setPosts([...fetched, ...initialPosts.filter(ip => !fetched.some(fp => String(fp.id) === String(ip.id)))]);
      }, (error) => {
        console.warn("Permission issue or Firestore connection error loading posts feed. Using default offline feed as fallback.", error);
        setPosts(initialPosts);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Error setting up live posts snapshot listener:", e);
      setPosts(initialPosts);
    }
  }, []);

  // Listen to comments realtime
  useEffect(() => {
    if (!activePostId || typeof activePostId === 'number') {
      setPostComments([]);
      return;
    }
    const q = query(collection(db, 'posts', String(activePostId), 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPostComments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()).toLocaleString() : 'Just now'
      })));
    });
    return () => unsubscribe();
  }, [activePostId]);

  const handlePost = async () => {
    if (!inputText.trim()) return;
    if (!user) {
      if (setAuthMode) setAuthMode('LOGIN');
      if (setCurrentView) setCurrentView('AUTH');
      return;
    }
    const username = profile?.email ? profile.email.split('@')[0] : 'cexpro_trader';
    const cleanHandle = `@${username}`;
    const postId = `post_${Date.now()}`;
    const newPostDoc = {
      postId,
      userId: user.uid,
      name: profile?.email ? username : 'CEXPRO Trader',
      handle: cleanHandle,
      content: inputText,
      likes: 0,
      likesUsers: [],
      retweets: 0,
      replies: 0,
      createdAt: serverTimestamp(),
      ...(attachTrade ? { attachedTrade: { pair: 'BTC/USDT', side: 'Long', roi: '+12.5%' } } : {})
    };

    try {
      await setDoc(doc(db, 'posts', postId), newPostDoc);
      setInputText('');
      setAttachTrade(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user || !activePostId) {
      if (!user) {
        if (setAuthMode) setAuthMode('LOGIN');
        if (setCurrentView) setCurrentView('AUTH');
      }
      return;
    }
    const username = profile?.email ? profile.email.split('@')[0] : 'CEXPRO User';
    try {
      const parentPostRef = doc(db, 'posts', String(activePostId));
      await addDoc(collection(parentPostRef, 'comments'), {
        userId: user.uid,
        name: username,
        content: commentText,
        createdAt: serverTimestamp()
      });
      // Increment reply count
      const activePost = posts.find(p => p.id === activePostId);
      if (activePost) {
        await updateDoc(parentPostRef, {
          replies: (activePost.replies || 0) + 1
        });
      }
      setCommentText('');
    } catch (e) {
      console.error('Failed to post comment', e);
    }
  };

  const handleLike = async (id: string | number) => {
    if (!user) {
      if (setAuthMode) setAuthMode('LOGIN');
      if (setCurrentView) setCurrentView('AUTH');
      return;
    }
    // For standard sample posts that aren't in firestore, allow visual local update
    if (typeof id === 'number' || id === '1' || id === '2' || id === '3' || id === '4') {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
      return;
    }
    const postRef = doc(db, 'posts', String(id));
    const findPost = posts.find(p => p.id === id);
    if (!findPost) return;

    const likedUsersList = findPost.likesUsers || [];
    const isAlreadyLiked = likedUsersList.includes(user.uid);
    const updatedLikesUsers = isAlreadyLiked 
      ? likedUsersList.filter((uid: string) => uid !== user.uid)
      : [...likedUsersList, user.uid];
    const likesDiff = isAlreadyLiked ? -1 : 1;

    try {
      await updateDoc(postRef, {
        likes: Math.max(0, (findPost.likes || 0) + likesDiff),
        likesUsers: updatedLikesUsers
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const handleRepost = async (id: string | number) => {
    if (!user) {
      if (setAuthMode) setAuthMode('LOGIN');
      if (setCurrentView) setCurrentView('AUTH');
      return;
    }
    if (typeof id === 'number' || id === '1' || id === '2' || id === '3' || id === '4') {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, retweets: p.retweets + 1 } : p));
      return;
    }
    const postRef = doc(db, 'posts', String(id));
    const findPost = posts.find(p => p.id === id);
    if (!findPost) return;
    try {
      await updateDoc(postRef, {
        retweets: (findPost.retweets || 0) + 1
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `posts/${id}`);
    }
  };

  // Category list referencing the specific image names & descriptions
  const categories = [
    { 
      id: 'COMMUNITY' as const, 
      title: 'Community', 
      subtitle: 'Insights from experts', 
      icon: Users,
      badge: 'Expert Feed',
      color: "text-[#10B981]", 
      bg: "bg-[#10B981]/10"
    },
    { 
      id: 'NEWS' as const, 
      title: 'News', 
      subtitle: 'Latest media articles', 
      icon: Newspaper,
      badge: 'Live News',
      color: "text-teal-500", 
      bg: "bg-teal-500/10"
    },
    { 
      id: 'ACADEMY' as const, 
      title: 'Cexpro Academy', 
      subtitle: 'Learn about crypto and the blockchain', 
      icon: GraduationCap,
      badge: 'Tutorials',
      color: "text-primary-500", 
      bg: "bg-primary-500/10"
    },
    { 
      id: 'BLOG' as const, 
      title: 'Cexpro Blog', 
      subtitle: 'In-depth analysis, trading strategies, and market outlooks', 
      icon: FileText,
      badge: 'Research',
      color: "text-[#F43F5E]", 
      bg: "bg-[#F43F5E]/10"
    },
  ];

  const newsArticles: any[] = [];
  const academyCourses: any[] = [];
  const blogPosts: any[] = [];

  const renderContent = (content: string) => {
    return content.split(/(\#[a-zA-Z0-9_]+)/g).map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); setActiveHashtag(part.substring(1)); setActivePostId(null); }}
            className="text-primary-500 hover:underline cursor-pointer font-bold"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const activePosts = posts.filter(p => activeHashtag ? p.content.toLowerCase().includes(`#${activeHashtag.toLowerCase()}`) : true);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto bg-dark-bg w-full custom-scroll"
    >
      <div className="w-full p-4 md:p-6 lg:p-8">
        
            {/* Responsive Mobile / Tablet navigation bar */}
            <div className="flex md:hidden overflow-x-auto gap-2 pb-4 scrollbar-none mb-4 shrink-0 select-none">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded whitespace-nowrap text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-white text-dark-bg font-extrabold shadow' 
                        : 'bg-dark-surface border border-dark-border text-dark-text-muted hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-dark-bg' : 'text-primary-500'}`} />
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full flex flex-col md:flex-row gap-8 items-stretch">
              
              {/* CENTRAL FEED COLUMN - Renders dynamic content based on selected tab */}
          <div className="flex-1 min-w-0 space-y-6">
            


            {/* View renders */}
            {activeCategory === 'COMMUNITY' && (
              <>
                {/* Active Hashtag or Post Header Back Button */}
                {(activeHashtag || activePostId) && (
                  <div className="flex items-center gap-3 mb-4 cursor-pointer text-dark-text-muted hover:text-white transition-colors" onClick={() => { setActiveHashtag(null); setActivePostId(null); }}>
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-bold">{activePostId ? 'Back to Feed' : `Trending: #${activeHashtag}`}</span>
                  </div>
                )}

                {/* Post Creator Box */}
                {!activePostId && (
                  <div className="bg-dark-surface border border-dark-border rounded-xl p-5">
                    <div className="flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center font-extrabold shrink-0 border border-dark-border select-none">
                         CP
                       </div>
                       <div className="flex-1">
                         <textarea 
                           value={inputText}
                           onChange={(e) => setInputText(e.target.value)}
                           placeholder="Share your technical analysis, questions, or news with CEXPRO experts..." 
                           className="w-full bg-transparent border-none text-white focus:outline-none min-h-[70px] resize-none text-[15px] placeholder-dark-text-muted font-sans"
                         ></textarea>
                         
                         {attachTrade && (
                           <div className="mt-2 mb-4 p-3 border border-primary-500/30 bg-primary-500/5 rounded-lg flex items-center justify-between">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded bg-dark-bg flex items-center justify-center font-bold text-white text-xs">BTC</div>
                               <div>
                                 <div className="text-white text-xs font-bold">BTC/USDT <span className="text-[#10B981] ml-1">Long</span></div>
                                 <div className="text-[#10B981] text-[10px] font-mono">+12.5% ROI</div>
                               </div>
                             </div>
                             <button onClick={() => setAttachTrade(false)} className="text-dark-text-muted hover:text-white p-1">
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                         )}

                         <div className="flex items-center justify-between pt-3 border-t border-dark-border/60">
                           <div className="flex gap-4 text-[#8B8B93]">
                              <button className="hover:bg-dark-surface-alt p-2 rounded-full transition-colors cursor-pointer" title="Simulate photo upload">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </button>
                              <button onClick={() => setAttachTrade(true)} className="hover:bg-dark-surface-alt p-2 rounded-full transition-colors cursor-pointer flex items-center gap-1.5" title="Share Trade Target">
                                <TrendingUp className="w-4 h-4 text-white" />
                                <span className="text-xs text-white font-bold hidden sm:inline">Share Trade</span>
                              </button>
                           </div>
                           <button 
                             onClick={handlePost}
                             className="bg-white hover:bg-white/90 text-dark-bg font-extrabold py-1.5 px-6 rounded-full text-xs transition-colors cursor-pointer select-none"
                           >
                             Publish Post
                           </button>
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* Feed Lists or Post Detail View */}
                {activePostId ? (
                  <div className="space-y-4">
                    {/* Active Post */}
                    <div className="bg-dark-surface border border-dark-border rounded-xl p-5 mb-4 mt-2">
                       {(() => {
                         const post = posts.find(p => p.id === activePostId);
                         if (!post) return <div className="text-white">Post not found.</div>;
                         return (
                           <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-full bg-dark-border shrink-0 flex items-center justify-center font-extrabold text-dark-text select-none text-xs border border-dark-border">
                               {post.name.charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1 flex-wrap">
                                 <h3 className="text-white font-extrabold text-sm">{post.name}</h3>
                                 <span className="text-dark-text-muted text-xs font-semibold">{post.handle}</span>
                                 <span className="text-dark-text-muted text-xs">·</span>
                                 <span className="text-dark-text-muted text-xs">{post.time}</span>
                               </div>
                               <p className="text-white text-[15px] leading-relaxed mb-4 whitespace-pre-wrap font-sans">
                                 {renderContent(post.content)}
                               </p>
                               
                               {post.attachedTrade && (
                                 <div className="mb-4 p-3 border border-dark-border bg-dark-bg rounded-lg flex items-center justify-between opacity-90 inline-block w-full max-w-sm">
                                   <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded bg-dark-surface flex items-center justify-center font-bold text-white text-xs">{post.attachedTrade.pair.split('/')[0]}</div>
                                     <div>
                                       <div className="text-white text-xs font-bold">{post.attachedTrade.pair} <span className="text-[#10B981] ml-1">{post.attachedTrade.side}</span></div>
                                       <div className="text-[#10B981] text-[10px] font-mono">{post.attachedTrade.roi} ROI</div>
                                     </div>
                                   </div>
                                 </div>
                               )}
                               
                               <div className="flex items-center gap-7 text-[#8B8B93] text-xs max-w-md select-none mt-2">
                                 <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group text-primary-500">
                                   <MessageSquare className="w-4 h-4" />
                                   <span>{post.replies}</span>
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleRepost(post.id); }} className="flex items-center gap-1.5 hover:text-buy transition-colors cursor-pointer group">
                                   <Repeat className="w-4 h-4" />
                                   <span>{post.retweets}</span>
                                 </button>
                                 <button onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} className="flex items-center gap-1.5 hover:text-sell transition-colors cursor-pointer group">
                                   <Heart className="w-4 h-4" />
                                   <span>{post.likes}</span>
                                 </button>
                               </div>
                             </div>
                           </div>
                         );
                       })()}
                    </div>

                    {/* Comment Composer */}
                    <div className="flex gap-4 items-start pl-14 mb-6">
                      <div className="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center font-extrabold text-white text-xs border border-dark-border">
                        {user ? 'M' : '?'}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <textarea 
                           value={commentText}
                           onChange={(e) => setCommentText(e.target.value)}
                           placeholder="Post your reply..." 
                           className="flex-1 bg-dark-surface border border-dark-border rounded-lg p-3 text-white focus:outline-none min-h-[50px] resize-none text-[13px] placeholder-dark-text-muted"
                        ></textarea>
                        <button onClick={handleComment} className="bg-primary-500 hover:bg-primary-600 text-black font-extrabold px-4 py-2 rounded-lg text-xs transition-colors self-end">Reply</button>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4 pl-14">
                      {postComments.map((comment, idx) => (
                         <div key={comment.id || idx} className="bg-dark-surface/50 border border-dark-border/40 rounded-xl p-4">
                           <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-xs font-bold text-white shrink-0">
                               {comment.name?.charAt(0) || 'U'}
                             </div>
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <h4 className="text-white font-bold text-xs">{comment.name}</h4>
                                 <span className="text-dark-text-muted text-[10px]">{comment.time}</span>
                               </div>
                               <p className="text-white text-[13px] leading-relaxed">
                                 {renderContent(comment.content)}
                               </p>
                             </div>
                           </div>
                         </div>
                      ))}
                      {postComments.length === 0 && (
                        <div className="text-dark-text-muted text-xs p-4 bg-dark-surface/30 rounded-lg text-center border border-dark-border/30">
                          No replies yet. Be the first to comment!
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activePosts.map((post, i) => (
                      <motion.div 
                        key={post.id} 
                        onClick={() => setActivePostId(post.id)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-dark-surface border border-dark-border rounded-xl p-5 hover:bg-dark-surface/80 transition-all cursor-pointer"
                      >
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-dark-border shrink-0 flex items-center justify-center font-extrabold text-dark-text select-none text-xs border border-dark-border">
                            {post.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-white font-extrabold text-sm">{post.name}</h3>
                              <span className="text-dark-text-muted text-xs font-semibold">{post.handle}</span>
                              <span className="text-dark-text-muted text-xs">·</span>
                              <span className="text-dark-text-muted text-xs">{post.time}</span>
                            </div>
                            <p className="text-white text-[14px] leading-relaxed mb-4 whitespace-pre-wrap font-sans">
                              {renderContent(post.content)}
                            </p>

                            {post.attachedTrade && (
                              <div className="mb-4 p-3 border border-dark-border bg-dark-bg rounded-lg flex items-center justify-between opacity-90 inline-block w-full max-w-[240px]">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-dark-surface flex items-center justify-center font-bold text-white text-xs">{post.attachedTrade.pair.split('/')[0]}</div>
                                  <div>
                                    <div className="text-white text-xs font-bold">{post.attachedTrade.pair} <span className="text-[#10B981] ml-1">{post.attachedTrade.side}</span></div>
                                    <div className="text-[#10B981] text-[10px] font-mono">{post.attachedTrade.roi} ROI</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-7 text-[#8B8B93] text-xs max-w-md select-none">
                              <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group">
                                <MessageSquare className="w-4 h-4" />
                                <span>{post.replies}</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRepost(post.id); }}
                                className="flex items-center gap-1.5 hover:text-buy transition-colors cursor-pointer group"
                              >
                                <Repeat className="w-4 h-4" />
                                <span>{post.retweets}</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                                className="flex items-center gap-1.5 hover:text-sell transition-colors cursor-pointer group"
                              >
                                <Heart className="w-4 h-4" />
                                <span>{post.likes}</span>
                              </button>
                              <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ml-auto">
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {activePosts.length === 0 && (
                      <div className="p-8 text-center text-dark-text-muted">
                        No posts found for #{activeHashtag}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeCategory === 'NEWS' && (
              <div className="space-y-4">
                {newsArticles.map((art, i) => (
                  <motion.div
                    key={art.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark-surface border border-dark-border rounded-xl p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-2.5 text-xs text-dark-text-muted select-none">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white bg-white/10 px-2 py-0.5 rounded text-[10px] tracking-wide">{art.source}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{art.time}</span>
                      </div>
                      <div className="bg-primary-500/10 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                        #{art.tag}
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-base leading-snug hover:text-primary-600 transition-colors cursor-pointer">
                      {art.title}
                    </h3>
                    <p className="text-dark-text-muted text-xs leading-relaxed mt-2 line-clamp-2">
                      {art.summary}
                    </p>
                    <div className="flex justify-between items-center mt-4 pt-3.5 border-t border-dark-border/40 text-xs">
                      <span className="text-dark-text-muted font-medium">{art.reads}</span>
                      <button className="text-white hover:underline text-xs flex items-center gap-1 font-bold cursor-pointer">
                        <span>Read Full Report</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeCategory === 'ACADEMY' && (
              <div className="grid grid-cols-1 gap-4">
                {academyCourses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark-surface border border-dark-border rounded-xl p-5 flex flex-col justify-between hover:border-white/20 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-bold tracking-wider select-none">
                        <span className="bg-white text-dark-bg px-2 py-0.5 rounded font-black">{course.level}</span>
                        <span className="text-dark-text-muted flex items-center gap-1 font-mono">
                          <BookOpen className="w-3.5 h-3.5" /> {course.duration}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base group-hover:text-primary-500 transition-colors cursor-pointer">
                        {course.title}
                      </h3>
                      <p className="text-dark-text-muted text-xs leading-relaxed mt-2">
                        {course.desc}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-dark-border/40 select-none">
                      <span className="text-xs text-dark-text-muted font-semibold">
                        {course.modules} learning sections · Created by {course.author}
                      </span>
                      <button className="bg-white/10 hover:bg-white text-white hover:text-dark-bg transition-all px-4 py-1.5 rounded text-xs font-extrabold flex items-center gap-1 cursor-pointer">
                        <span>Start Course</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeCategory === 'BLOG' && (
              <div className="space-y-4">
                {blogPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark-surface border border-dark-border rounded-xl p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs select-none">
                      <span className="text-primary-500 bg-primary-500/10 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                        {post.category}
                      </span>
                      <span className="text-dark-text-muted font-mono">{post.date}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-snug cursor-pointer hover:text-primary-500 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-dark-text-muted text-xs leading-relaxed mt-2.5">
                      {post.summary}
                    </p>
                    <div className="flex justify-between items-center mt-4 pt-3.5 border-t border-dark-border/40 text-xs select-none">
                      <span className="text-dark-text-muted font-semibold">
                        Author: <span className="text-white">{post.author}</span>
                      </span>
                      <div className="flex gap-2">
                        <button className="p-1.5 text-dark-text-muted hover:text-white transition-colors cursor-pointer" title="Bookmark article">
                          <Bookmark className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-dark-text-muted hover:text-white transition-colors cursor-pointer" title="Share article">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR COLUMN - Top Communities */}
          <div className="w-80 hidden lg:block shrink-0 space-y-4 select-none">
            <div className="bg-dark-surface border border-dark-border/60 rounded-xl p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-500" />
                  <span>Top Communities</span>
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Bitcoin Maxis', members: '124K' },
                  { name: 'DeFi Degens', members: '89K' },
                  { name: 'Web3 Builders', members: '150K' },
                  { name: 'NFT Collectors', members: '210K' },
                  { name: 'Solana Summer', members: '54K' },
                ].map((community, i) => (
                  <div key={i} className="flex items-center justify-between space-x-3 cursor-pointer group pb-3 border-b border-dark-border/40 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center text-white font-bold text-xs uppercase cursor-pointer group-hover:border-primary-500 transition-colors">
                        {community.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-white text-xs font-black group-hover:text-primary-500 transition-colors">{community.name}</div>
                        <div className="text-[10px] text-dark-text-muted mt-0.5">
                          {community.members} Members
                        </div>
                      </div>
                    </div>
                    <button className="text-[10px] bg-dark-bg border border-dark-border px-2 py-1 rounded text-white group-hover:border-primary-500 transition-colors uppercase font-bold">
                       Join
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-dark-surface border border-dark-border/60 rounded-xl p-5 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  <span>Trending Topics</span>
                </h3>
              </div>
              <div className="space-y-4">
                {['#BTC', '#EthereumETF', '#SolanaSummer', '#DeFi', '#Web3Gaming'].map((topic, i) => (
                  <div key={i} className="cursor-pointer group pb-3 border-b border-dark-border/40 last:border-0 last:pb-0">
                    <div className="text-[10px] text-dark-text-muted flex justify-between">
                       <span>Trending in Crypto</span>
                    </div>
                    <div className="text-white text-xs font-black group-hover:text-primary-500 transition-colors mt-0.5">{topic}</div>
                    <div className="text-[10px] text-dark-text-muted mt-0.5">
                      {Math.floor(Math.random() * 40) + 15}K real-time posts
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
  </div>
</motion.div>
);
}
