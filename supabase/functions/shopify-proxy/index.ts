// Supabase Edge Function: Shopify API Proxy
// This function proxies requests to the Shopify Admin API to avoid CORS issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ShopifyRequest {
  action: 'test_connection' | 'get_products' | 'get_collections' | 'get_smart_collections'
  shop_domain: string
  access_token: string
  limit?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client to verify JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: ShopifyRequest = await req.json()
    const { action, shop_domain, access_token, limit } = body

    if (!shop_domain || !access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing shop_domain or access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up domain
    let cleanDomain = shop_domain.trim()
      .replace('https://', '')
      .replace('http://', '')
      .replace(/\/$/, '')

    if (!cleanDomain.includes('.myshopify.com')) {
      cleanDomain = `${cleanDomain}.myshopify.com`
    }

    const apiVersion = '2023-10'
    let endpoint = ''

    switch (action) {
      case 'test_connection':
        endpoint = `https://${cleanDomain}/admin/api/${apiVersion}/shop.json`
        break
      case 'get_products':
        const productLimit = limit || 50
        endpoint = `https://${cleanDomain}/admin/api/${apiVersion}/products.json?limit=${productLimit}`
        break
      case 'get_collections':
        endpoint = `https://${cleanDomain}/admin/api/${apiVersion}/custom_collections.json`
        break
      case 'get_smart_collections':
        endpoint = `https://${cleanDomain}/admin/api/${apiVersion}/smart_collections.json`
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Make request to Shopify
    const shopifyResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    })

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text()
      console.error('Shopify API error:', shopifyResponse.status, errorText)

      let errorMessage = 'Shopify API Fehler'
      if (shopifyResponse.status === 401) {
        errorMessage = 'Ungültiger Access Token'
      } else if (shopifyResponse.status === 403) {
        errorMessage = 'Zugriff verweigert - Fehlende Berechtigungen'
      } else if (shopifyResponse.status === 404) {
        errorMessage = 'Shop nicht gefunden - Überprüfe die Domain'
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          status: shopifyResponse.status,
          details: errorText
        }),
        { status: shopifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await shopifyResponse.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
