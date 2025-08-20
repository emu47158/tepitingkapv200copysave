import React, { useState, useEffect } from 'react'
import { supabase, Post, CommunityPost, Profile, hasValidSupabaseConfig } from '../lib/supabase'
import { PostCard } from './PostCard'
import { AnonymousPostCard } from './AnonymousPostCard'
import { PostForm } from './PostForm'
import { AnonymousPostForm } from './AnonymousPostForm'

interface PostFeedProps {
  currentUser: Profile
  section: string
}

// Demo posts for when Supabase is not configured
const demoPostsData = [
  {
    id: '1',
    user_id: 'demo-user-123',
    content: 'Welcome to our social platform! 🎉 This is a demo post to show how the feed works. Feel free to interact with it!',
    images: ['https://images.pexels.com/photos/1591056/pexels-photo-1591056.jpeg?auto=compress&cs=tinysrgb&w=800'],
    files: [],
    visibility: 'public',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    profiles: {
      id: 'demo-user-123',
      username: 'demouser',
      full_name: 'Demo User',
      email: 'demo@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    likes: [],
    comments: [],
    _count: { likes: 5, comments: 2 }
  }
]

const demoAnonymousPostsData = [
  {
    id: '2',
    user_id: 'demo-user-456',
    content: 'This is an anonymous post. You can share your thoughts freely without revealing your identity. Perfect for sensitive topics or when you want complete privacy.',
    images: null,
    files: null,
    visibility: 'anonymous',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    profiles: null, // No profile data for anonymous posts
    likes: [],
    comments: [],
    _count: { likes: 3, comments: 1 }
  }
]

export function PostFeed({ currentUser, section }: PostFeedProps) {
  const [posts, setPosts] = useState<(Post | CommunityPost)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPosts()
  }, [section])

  const loadPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use demo data if Supabase is not configured
      if (!hasValidSupabaseConfig()) {
        console.log('🔧 Using demo data - Supabase not configured')
        if (section === 'public' || !section) {
          setPosts(demoPostsData)
        } else if (section === 'anonymous') {
          setPosts(demoAnonymousPostsData)
        } else {
          setPosts([])
        }
        setLoading(false)
        return
      }

      console.log('🔍 Loading posts for section:', section || 'public (default)')

      // Load posts based on section
      let query = supabase.from('posts').select('*')

      if (section === 'public' || !section) {
        console.log('🔍 Loading public posts...')
        query = query.eq('visibility', 'public').is('community_id', null)
      } else if (section === 'anonymous') {
        console.log('🔍 Loading anonymous posts...')
        query = query.eq('visibility', 'anonymous').is('community_id', null)
      } else {
        // For community posts or other sections
        console.log('🔍 Loading posts for section:', section)
        query = query.eq('community_id', section)
      }

      const { data: simplePosts, error: postsError } = await query.order('created_at', { ascending: false })

      console.log('📊 Posts query result:', simplePosts)
      console.log('📊 Posts error:', postsError)

      if (postsError) {
        console.error('❌ Posts query error:', postsError)
        setError(`Database error: ${postsError.message}`)
        setLoading(false)
        return
      }

      if (!simplePosts || simplePosts.length === 0) {
        console.log('📭 No posts found for section:', section || 'public')
        setPosts([])
        setLoading(false)
        return
      }

      console.log('🔄 Processing posts with additional data...')
      
      // Get additional data for each post
      const postsWithProfiles = []
      
      for (const post of simplePosts) {
        console.log('🔄 Processing post:', post.id)
        let profile = null
        
        // For anonymous posts, don't load profile data
        if (section !== 'anonymous') {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', post.user_id)
            .single()
          
          console.log('👤 Profile data for post', post.id, ':', profileData)
          if (profileError) {
            console.log('⚠️ Profile error for post', post.id, ':', profileError)
          }
          
          profile = profileData
        }

        // Get likes count
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('id, user_id')
          .eq('post_id', post.id)

        console.log('❤️ Likes for post', post.id, ':', likes)
        if (likesError) {
          console.log('⚠️ Likes error for post', post.id, ':', likesError)
        }

        // Get comments
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id
          `)
          .eq('post_id', post.id)
          .order('created_at', { ascending: true })

        console.log('💬 Comments for post', post.id, ':', comments)
        if (commentsError) {
          console.log('⚠️ Comments error for post', post.id, ':', commentsError)
        }

        // Get comment profiles (also anonymous for anonymous posts)
        const commentsWithProfiles = []
        if (comments) {
          for (const comment of comments) {
            let commentProfile = null
            
            // For anonymous posts, don't load comment profiles either
            if (section !== 'anonymous') {
              const { data: commentProfileData } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', comment.user_id)
                .single()
              
              commentProfile = commentProfileData
            }

            commentsWithProfiles.push({
              ...comment,
              profiles: commentProfile
            })
          }
        }

        postsWithProfiles.push({
          ...post,
          visibility: post.visibility || section || 'public',
          profiles: profile,
          likes: likes || [],
          comments: commentsWithProfiles,
          _count: {
            likes: likes?.length || 0,
            comments: commentsWithProfiles.length || 0,
          },
        })
      }

      console.log('✅ Final posts with profiles:', postsWithProfiles)
      setPosts(postsWithProfiles)
    } catch (error) {
      console.error('💥 Error loading posts:', error)
      setError(`Failed to load posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!hasValidSupabaseConfig()) {
      // Demo mode - just update local state
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const isLiked = post.likes?.some(l => l.user_id === currentUser.id)
            const newLikesCount = isLiked 
              ? (post._count?.likes || 0) - 1 
              : (post._count?.likes || 0) + 1
            
            return {
              ...post,
              _count: {
                ...post._count,
                likes: newLikesCount
              }
            }
          }
          return post
        })
      )
      return
    }

    try {
      const existingLike = posts
        .find(p => p.id === postId)
        ?.likes?.find(l => l.user_id === currentUser.id)

      if (existingLike) {
        await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id)
      } else {
        await supabase
          .from('likes')
          .insert([{ user_id: currentUser.id, post_id: postId }])
      }

      loadPosts()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleComment = async (postId: string, content: string) => {
    if (!hasValidSupabaseConfig()) {
      // Demo mode - just show success message
      alert('Comment added! (Demo mode)')
      return
    }

    try {
      await supabase
        .from('comments')
        .insert([{
          user_id: currentUser.id,
          post_id: postId,
          content,
        }])

      loadPosts()
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handlePostCreated = () => {
    loadPosts()
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Posts</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadPosts}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-6">
        {/* Post Creation Form */}
        {(section === 'public' || !section) && (
          <PostForm onPostCreated={handlePostCreated} />
        )}
        
        {section === 'anonymous' && (
          <AnonymousPostForm onPostCreated={handlePostCreated} />
        )}

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">
                {section === 'anonymous' ? '🤐' : '📝'}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {section === 'anonymous' ? 'No anonymous posts yet' : 'No public posts yet'}
            </h3>
            <p className="text-gray-600">
              {section === 'anonymous' 
                ? 'Share your thoughts anonymously - no usernames, just pure content!'
                : 'Be the first to share something with the community!'
              }
            </p>
          </div>
        ) : (
          posts.map((post) => (
            section === 'anonymous' ? (
              <AnonymousPostCard
                key={post.id}
                post={post as Post}
                currentUser={currentUser}
                onLike={handleLike}
                onComment={handleComment}
              />
            ) : (
              <PostCard
                key={post.id}
                post={post as Post}
                currentUser={currentUser}
                onLike={handleLike}
                onComment={handleComment}
              />
            )
          ))
        )}
      </div>
    </div>
  )
}
